/**
 * The web build's security check: Firebase's own invisible reCAPTCHA, which
 * works in a browser without any of the WebView plumbing the phone needs.
 * Same handle as RecaptchaGate.tsx.
 */
import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { View } from 'react-native';
import { RecaptchaVerifier } from 'firebase/auth';
import { auth } from '../../config/firebase';
import type { RecaptchaVerifierHandle } from './recaptchaTypes';

const CONTAINER_ID = 'finsight-recaptcha';

export const RecaptchaGate = forwardRef<RecaptchaVerifierHandle>(function RecaptchaGate(_props, ref) {
    const verifier = useRef<RecaptchaVerifier | null>(null);

    useImperativeHandle(ref, () => ({
        type: 'recaptcha',
        verify: () => {
            verifier.current ??= new RecaptchaVerifier(auth, CONTAINER_ID, { size: 'invisible' });
            return verifier.current.verify();
        },
        _reset: () => {
            verifier.current?.clear();
            verifier.current = null;
        },
    }), []);

    return <View nativeID={CONTAINER_ID} />;
});
