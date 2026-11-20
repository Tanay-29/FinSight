/**
 * The artwork behind the four intro scenes: a street at sunset, a classroom,
 * a shop window at night, and a closing scene with Fini.
 *
 * Every scene is drawn in a 284 x 350 box and split into three layers (far,
 * mid, near), so the intro can slide them at different speeds and the scene
 * reads as a place with depth rather than a flat picture. The pieces that
 * move or change (coins, labels, Fini, the price tag) are not drawn here;
 * IntroScreen lays them over the art so they animate on the UI thread.
 *
 * Like Fini's own colours, these are illustration colours and do not follow
 * the theme: the picture looks the same in light and dark mode.
 */
import React from 'react';
import Svg, { Circle, Ellipse, G, Path, Rect, Text as SvgText } from 'react-native-svg';
import { FONTS } from '../../theme/tokens';

export const ART_W = 284;
export const ART_H = 350;

export type Layer = 'far' | 'mid' | 'near';

/** Fini, drawn in a 256 box. */
export const FiniArt: React.FC<{ size: number }> = ({ size }) => (
    <Svg width={size} height={size} viewBox="0 0 256 256">
        <Path fill="#2E8A55" d="M121 70 L121 50 Q121 44 128 44 Q135 44 135 50 L135 70 Z" />
        <Path fill="#3FAF6E" d="M128 54 C104 56 86 42 80 20 C106 16 126 30 128 54 Z" />
        <Path fill="#3FAF6E" d="M128 48 C136 22 158 10 186 12 C184 38 162 52 128 48 Z" />
        <Circle cx={128} cy={152} r={86} fill="#D9960F" />
        <Circle cx={128} cy={152} r={78} fill="#F5B82E" />
        <Circle cx={98} cy={146} r={13} fill="#3A2A14" />
        <Circle cx={158} cy={146} r={13} fill="#3A2A14" />
        <Circle cx={102} cy={141} r={4} fill="#FFFFFF" />
        <Circle cx={162} cy={141} r={4} fill="#FFFFFF" />
        <Circle cx={80} cy={172} r={9} fill="#F28C6B" opacity={0.7} />
        <Circle cx={176} cy={172} r={9} fill="#F28C6B" opacity={0.7} />
        <Path fill="#3A2A14" d="M96 176 Q128 212 160 176 Q128 194 96 176 Z" />
    </Svg>
);

/** A rupee coin, drawn in a 20 box. */
export const CoinArt: React.FC<{ size: number }> = ({ size }) => (
    <Svg width={size} height={size} viewBox="0 0 20 20">
        <Circle cx={10} cy={10} r={9} fill="#D9960F" />
        <Circle cx={10} cy={10} r={7} fill="#F5B82E" />
        <Path d="M7 6.5h6M7 9h6M8 6.5c3 0 3 5 0 5l4.5 3" stroke="#8A5A0B" strokeWidth={1.4} fill="none" strokeLinecap="round" />
    </Svg>
);

const Street: Record<Layer, React.ReactNode> = {
    far: (
        <>
            <Rect width={ART_W} height={ART_H} fill="#F6C59C" />
            <Circle cx={214} cy={84} r={34} fill="#FBE2C2" />
            <Path d="M0 120 Q60 100 120 118 T284 110 V350 H0Z" fill="#F0B486" opacity={0.6} />
        </>
    ),
    mid: (
        <>
            <Path d="M0 250 V170 h26 v-22 h22 v32 h20 v-48 h30 v40 h18 v-30 h28 v58 h22 v-36 h26 v-20 h24 v52 h20 v-28 h28 V250Z" fill="#E39A6E" />
            <G fill="#F6C59C" opacity={0.7}>
                <Rect x={76} y={150} width={6} height={8} />
                <Rect x={88} y={150} width={6} height={8} />
                <Rect x={76} y={166} width={6} height={8} />
                <Rect x={190} y={164} width={6} height={8} />
                <Rect x={202} y={164} width={6} height={8} />
            </G>
        </>
    ),
    near: (
        <>
            <Rect x={0} y={250} width={ART_W} height={100} fill="#4A3230" />
            <Rect x={0} y={292} width={ART_W} height={4} fill="#5E4240" />
            {/* Chai stall */}
            <Rect x={14} y={196} width={72} height={56} rx={4} fill="#B5503A" />
            <Path d="M10 196 h80 l-6 -16 h-68z" fill="#F4E3C8" />
            <Path d="M18 180 l-4 16 h12 l3-16z M42 180 l-1 16 h12 l1-16z M66 180 l2 16 h12 l-3-16z" fill="#D35F45" />
            <Rect x={34} y={214} width={16} height={16} rx={3} fill="#F4E3C8" />
            <Path d="M50 218 q7 0 7 5 t-7 5" stroke="#F4E3C8" strokeWidth={3} fill="none" />
            {/* Food delivery scooter */}
            <Rect x={110} y={232} width={56} height={20} rx={10} fill="#E8553E" />
            <Circle cx={118} cy={256} r={9} fill="#2A1C1B" />
            <Circle cx={158} cy={256} r={9} fill="#2A1C1B" />
            <Rect x={128} y={206} width={26} height={24} rx={4} fill="#F5B82E" />
            <Rect x={134} y={214} width={14} height={3} fill="#8A5A0B" />
            {/* Metro */}
            <Rect x={196} y={186} width={74} height={66} rx={5} fill="#3B3F8F" />
            <Rect x={204} y={198} width={58} height={16} rx={8} fill="#F4E3C8" />
            <SvgText x={233} y={210} textAnchor="middle" fontSize={10} fontWeight="bold" fill="#3B3F8F">METRO</SvgText>
            <Rect x={214} y={222} width={38} height={30} rx={3} fill="#2A2E6E" />
            {/* Wallet */}
            <Rect x={118} y={300} width={48} height={34} rx={8} fill="#5B3FD1" />
            <Rect x={140} y={310} width={28} height={14} rx={6} fill="#7A63E0" />
            <Circle cx={152} cy={317} r={3} fill="#F5B82E" />
        </>
    ),
};

const Classroom: Record<Layer, React.ReactNode> = {
    far: (
        <>
            <Rect width={ART_W} height={ART_H} fill="#EFE0C2" />
            <Rect width={ART_W} height={34} fill="#E5D3B0" />
            <Rect x={30} width={4} height={ART_H} fill="#E5D3B0" />
            <Rect x={250} width={4} height={ART_H} fill="#E5D3B0" />
        </>
    ),
    mid: (
        <>
            <Rect x={22} y={58} width={240} height={160} rx={6} fill="#8A5A33" />
            <Rect x={30} y={66} width={224} height={144} rx={3} fill="#24493B" />
            <SvgText x={48} y={100} fontSize={17} fill="#EAF2EC" fontFamily={FONTS.display}>₹1,000 at 10% a year</SvgText>
            <SvgText x={48} y={128} fontSize={17} fill="#EAF2EC" fontFamily={FONTS.display}>for 2 years =</SvgText>
            <Rect x={190} y={214} width={40} height={6} rx={2} fill="#F4E3C8" />
        </>
    ),
    near: (
        <>
            <Rect x={0} y={262} width={ART_W} height={88} fill="#B98552" />
            <Rect x={0} y={262} width={ART_W} height={10} fill="#A0703F" />
            <Rect x={26} y={240} width={56} height={22} rx={3} fill="#5B3FD1" />
            <Rect x={30} y={232} width={48} height={10} rx={2} fill="#E8553E" />
        </>
    ),
};

const ShopWindow: Record<Layer, React.ReactNode> = {
    far: (
        <>
            <Rect width={ART_W} height={ART_H} fill="#1C1934" />
            <G fill="#F4E3C8" opacity={0.5}>
                <Circle cx={30} cy={30} r={1.5} />
                <Circle cx={90} cy={18} r={1} />
                <Circle cx={250} cy={40} r={1.5} />
                <Circle cx={200} cy={14} r={1} />
            </G>
        </>
    ),
    mid: (
        <>
            <Rect x={18} y={52} width={248} height={214} rx={10} fill="#2B2752" />
            <Rect x={28} y={62} width={228} height={194} rx={6} fill="#36316A" />
            <Ellipse cx={142} cy={80} rx={90} ry={22} fill="#F5B82E" opacity={0.12} />
            <Rect x={60} y={214} width={164} height={12} rx={3} fill="#4A447F" />
            <Rect x={112} y={96} width={60} height={112} rx={12} fill="#0E0C1A" />
            <Rect x={117} y={102} width={50} height={100} rx={8} fill="#4F46E5" />
            <Rect x={132} y={106} width={20} height={5} rx={2.5} fill="#0E0C1A" />
            <Circle cx={142} cy={160} r={12} fill="#7A72F0" />
            <Path d="M190 70 L196 128" stroke="#C9C3EA" strokeWidth={1.5} />
        </>
    ),
    near: <Rect x={0} y={282} width={ART_W} height={68} fill="#141228" />,
};

const Welcome: Record<Layer, React.ReactNode> = {
    far: (
        <>
            <Rect width={ART_W} height={ART_H} fill="#4F46E5" />
            <Circle cx={142} cy={170} r={120} fill="#5B53EA" />
            <Circle cx={142} cy={170} r={80} fill="#6A62F0" />
        </>
    ),
    mid: null,
    near: null,
};

export const SCENES = [Street, Classroom, ShopWindow, Welcome];

/** One layer of one scene, filling its box and cropped from the sides if the box is short. */
export const SceneLayer: React.FC<{ scene: number; layer: Layer; width: number; height: number }> = ({
    scene,
    layer,
    width,
    height,
}) => {
    const content = SCENES[scene][layer];
    if (!content) return null;
    return (
        <Svg width={width} height={height} viewBox={`0 0 ${ART_W} ${ART_H}`} preserveAspectRatio="xMidYMax slice">
            {content}
        </Svg>
    );
};
