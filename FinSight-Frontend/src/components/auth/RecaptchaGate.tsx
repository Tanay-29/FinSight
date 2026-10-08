/**
 * The security check Firebase requires before it will text a code.
 *
 * Native Firebase SDKs prove the app is genuine with Play Integrity or APNs.
 * The JS SDK this app uses has neither, so it asks for a reCAPTCHA token
 * instead, and reCAPTCHA only runs in a web page on a domain the Firebase
 * project trusts. This loads a tiny page into a WebView with the project's
 * own auth domain as its origin, lets reCAPTCHA run there, and passes the
 * token back.
 *
 * Invisible mode, so most people see a second of "checking" and nothing
 * else. When Google does want a puzzle solved, it appears inside the sheet and
 * the person solves it themselves.
 *
 * The web build resolves RecaptchaGate.web.tsx instead.
 */
import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { Modal, View, Text, Pressable, ActivityIndicator } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ShieldCheck } from 'lucide-react-native';
import { firebaseConfig } from '../../config/firebase';
import { COLORS, TYPE, RADIUS, GUTTER, FONTS } from '../../theme/tokens';
import { codedError, RecaptchaVerifierHandle } from './recaptchaTypes';

/** The compat build exposes RecaptchaVerifier on a global, which a page with no bundler needs. */
const SDK = 'https://www.gstatic.com/firebasejs/10.14.1';

const page = (): string => `<!DOCTYPE html>
<html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<style>html,body{margin:0;padding:0;background:transparent;height:100%}#c{display:flex;justify-content:center}</style>
<script src="${SDK}/firebase-app-compat.js"></script>
<script src="${SDK}/firebase-auth-compat.js"></script>
</head><body><div id="c"></div>
<script>
function send(m){window.ReactNativeWebView.postMessage(JSON.stringify(m));}
try {
  firebase.initializeApp(${JSON.stringify({
      apiKey: firebaseConfig.apiKey,
      authDomain: firebaseConfig.authDomain,
      projectId: firebaseConfig.projectId,
  })});
  var v = new firebase.auth.RecaptchaVerifier('c', {
    size: 'invisible',
    'expired-callback': function(){ send({type:'error'}); }
  });
  v.verify().then(function(t){ send({type:'token', token:t}); })
    .catch(function(){ send({type:'error'}); });
} catch (e) { send({type:'error'}); }
</script></body></html>`;

type Pending = { resolve: (token: string) => void; reject: (error: Error) => void };

export const RecaptchaGate = forwardRef<RecaptchaVerifierHandle>(function RecaptchaGate(_props, ref) {
    const insets = useSafeAreaInsets();
    const [open, setOpen] = useState(false);
    const pending = useRef<Pending | null>(null);

    /** Settle once. Closing the sheet unmounts the WebView, so every check starts clean. */
    const settle = (fn: (p: Pending) => void) => {
        const p = pending.current;
        pending.current = null;
        setOpen(false);
        if (p) fn(p);
    };

    useImperativeHandle(ref, () => ({
        type: 'recaptcha',
        verify: () => new Promise<string>((resolve, reject) => {
            pending.current = { resolve, reject };
            setOpen(true);
        }),
        _reset: () => {
            pending.current = null;
            setOpen(false);
        },
    }), []);

    const onMessage = (event: WebViewMessageEvent) => {
        let message: { type?: string; token?: unknown };
        try {
            message = JSON.parse(event.nativeEvent.data);
        } catch {
            return;
        }
        if (message.type === 'token' && typeof message.token === 'string') {
            const token = message.token;
            settle((p) => p.resolve(token));
        } else if (message.type === 'error') {
            settle((p) => p.reject(codedError('auth/captcha-check-failed')));
        }
    };

    const cancel = () => settle((p) => p.reject(codedError('app/recaptcha-cancelled')));

    return (
        <Modal visible={open} transparent animationType="fade" onRequestClose={cancel} statusBarTranslucent>
            <View className="flex-1 justify-end bg-black/50">
                <View
                    className="bg-surface-primary"
                    style={{
                        borderTopLeftRadius: RADIUS.pill,
                        borderTopRightRadius: RADIUS.pill,
                        paddingTop: 20,
                        paddingBottom: insets.bottom + 16,
                    }}
                >
                    <View className="flex-row items-center justify-between" style={{ paddingHorizontal: GUTTER }}>
                        <View className="flex-row items-center flex-1 mr-3">
                            <ShieldCheck size={20} color={COLORS.brand.link} strokeWidth={1.8} />
                            <Text style={TYPE.heading} className="text-text-primary ml-2">Quick security check</Text>
                        </View>
                        <Pressable onPress={cancel} hitSlop={12} accessibilityRole="button">
                            <Text style={[TYPE.callout, { fontFamily: FONTS.semibold }]} className="text-brand-link">Cancel</Text>
                        </Pressable>
                    </View>
                    <View className="flex-row items-center mt-2 mb-3" style={{ paddingHorizontal: GUTTER }}>
                        <ActivityIndicator size="small" color={COLORS.brand.primary} />
                        <Text style={TYPE.caption} className="text-text-secondary ml-2 flex-1">
                            Making sure this is really you. If a puzzle appears, solve it and your code is on its way.
                        </Text>
                    </View>
                    {/* Tall enough for reCAPTCHA's image grid, which is the
                        largest thing it ever shows. */}
                    <View style={{ height: 480 }}>
                        {open && (
                            <WebView
                                source={{ html: page(), baseUrl: `https://${firebaseConfig.authDomain}` }}
                                originWhitelist={['*']}
                                onMessage={onMessage}
                                onError={() => settle((p) => p.reject(codedError('auth/network-request-failed')))}
                                javaScriptEnabled
                                domStorageEnabled
                                thirdPartyCookiesEnabled
                                style={{ backgroundColor: 'transparent' }}
                            />
                        )}
                    </View>
                </View>
            </View>
        </Modal>
    );
});
