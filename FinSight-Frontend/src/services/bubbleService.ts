/**
 * Bubble Room on Firestore.
 *
 *   rooms/{code}                 the market: status, price, history, headline
 *   rooms/{code}/players/{pid}   one per phone; created by the player, then
 *                                written only by the host
 *   rooms/{code}/orders/{id}     append-only buy and sell taps from players
 *
 * The host's phone is the exchange. It listens to orders, fills them in the
 * order they arrived with utils/bubble.ts, and writes the room and the
 * changed players once a second. Players never write shared state, so twenty
 * phones tapping at once never contend on one document. Rules for all three
 * live in firestore.rules.
 *
 * Players join from a browser, no install: the join page is served by
 * Firebase Hosting from bubble-web/ and reads the project's public web config
 * from the link, so it needs no setup of its own.
 */
import {
    collection, doc, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc, writeBatch, getDoc,
} from 'firebase/firestore';
import { db, firebaseConfig } from '../config/firebase';
import { roomCode, PlayerState, Side } from '../utils/bubble';

export type RoomStatus = 'lobby' | 'live' | 'ended';

export interface RoomDoc {
    hostUid: string;
    status: RoomStatus;
    price: number;
    demand: number;
    history: number[];
    headline: string | null;
    startedAt: number | null;
    createdAt?: unknown;
}

export interface PlayerDoc extends PlayerState {
    name: string;
    joinedAt: number;
}

export interface OrderDoc {
    pid: string;
    side: Side;
    at: number;
}

const roomRef = (code: string) => doc(db, 'rooms', code);

/** Make a fresh room, retrying if the random code is already taken. */
export async function createRoom(hostUid: string): Promise<string> {
    for (let i = 0; i < 5; i++) {
        const code = roomCode();
        const existing = await getDoc(roomRef(code)).catch(() => null);
        if (existing?.exists()) continue;
        const room: RoomDoc = {
            hostUid, status: 'lobby', price: 100, demand: 0, history: [100], headline: null, startedAt: null,
        };
        await setDoc(roomRef(code), { ...room, createdAt: serverTimestamp() });
        return code;
    }
    throw new Error('Could not find a free room code');
}

/**
 * The link the QR code opens. The page gets the project's web config from
 * Firebase Hosting's reserved /__/firebase/init.json, so the link only needs
 * the room code, and typing the address plus the code works too.
 */
export function joinUrl(code: string): string {
    return `https://${firebaseConfig.projectId}.web.app/?r=${encodeURIComponent(code)}`;
}

export function listenRoom(code: string, cb: (r: RoomDoc | null) => void) {
    return onSnapshot(roomRef(code), (s) => cb(s.exists() ? (s.data() as RoomDoc) : null), () => cb(null));
}

export function listenPlayers(code: string, cb: (players: Record<string, PlayerDoc>) => void) {
    return onSnapshot(collection(db, 'rooms', code, 'players'), (s) => {
        const out: Record<string, PlayerDoc> = {};
        s.forEach((d) => { out[d.id] = d.data() as PlayerDoc; });
        cb(out);
    });
}

/** New orders only, in arrival order. */
export function listenOrders(code: string, cb: (orders: { id: string; order: OrderDoc }[]) => void) {
    return onSnapshot(query(collection(db, 'rooms', code, 'orders'), orderBy('at')), (s) => {
        const fresh = s.docChanges().filter((c) => c.type === 'added').map((c) => ({ id: c.doc.id, order: c.doc.data() as OrderDoc }));
        if (fresh.length) cb(fresh);
    });
}

export function startRoom(code: string, now: number) {
    return updateDoc(roomRef(code), { status: 'live', startedAt: now, headline: null });
}

/** One host tick: the market, and every player whose holdings changed. */
export async function writeTick(
    code: string,
    room: Partial<RoomDoc>,
    changed: Record<string, PlayerState>,
) {
    const batch = writeBatch(db);
    batch.update(roomRef(code), room);
    for (const [pid, p] of Object.entries(changed)) {
        batch.update(doc(db, 'rooms', code, 'players', pid), { ...p });
    }
    await batch.commit();
}
