// App.js — WizMarketing WebView Bridge (push-only)
// deps: react-native-webview, @react-native-firebase/messaging, @notifee/react-native, react-native-share

import React, { useCallback, useEffect, useRef, useState } from 'react';
import '@react-native-firebase/app';
import {
  SafeAreaView, BackHandler, StyleSheet, Platform,Alert,
  Linking, LogBox, Animated, ToastAndroid, Easing,
} from 'react-native';
import { WebView } from 'react-native-webview';
import messaging from '@react-native-firebase/messaging';
import notifee from '@notifee/react-native';
import Share from 'react-native-share';

import SplashScreenRN from './SplashScreenRN';

const APP_VERSION = '1.0.0';
const BOOT_TIMEOUT_MS = 8000;
const MIN_SPLASH_MS = 1200;

const App = () => {
  const webViewRef = useRef(null);

  const [splashVisible, setSplashVisible] = useState(true);
  const splashStartRef = useRef(0);
  const splashFade = useRef(new Animated.Value(1)).current;

  const bootTORef = useRef(null);

  const backExitRef = useRef({ last: 0 });

  const [token, setToken] = useState('');


  const lastNavRef = useRef({ isRoot: false, path: '/', canGoBack: false });

  const lastNavStateRef = useRef({});      // 기본값은 객체


  useEffect(() => { LogBox.ignoreAllLogs(true); }, []);


useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
    const nav = lastNavStateRef.current || {};
    console.log('[HW BACK] event fired, nav=', nav);

    const isRoot = nav.isRoot === true;
    const webCanHandle =
      !isRoot || nav.hasBlockingUI === true || nav.needsConfirm === true || nav.canGoBackInWeb === true;

    if (webCanHandle) {
      console.log('[HW BACK] sending BACK_REQUEST');
      sendToWeb('BACK_REQUEST', { nav, at: Date.now() });
      return true;
    }

    // 루트면 종료 확인…
    Alert.alert('앱 종료', '앱을 종료할까요?', [
      { text: '취소', style: 'cancel' },
      { text: '종료', style: 'destructive', onPress: () => BackHandler.exitApp() },
    ]);
    return true;
  });
  return () => sub.remove();
}, [sendToWeb]);



  const sendToWeb = useCallback((type, payload = {}) => {
    try {
      const msg = JSON.stringify({ type, payload });
      webViewRef.current?.postMessage(msg);
      if (__DEV__) console.log('📡 to Web:', msg);
    } catch (e) { console.log('❌ postMessage error:', e); }
  }, []);



const handleWebReady = useCallback(() => {
  // 타임아웃 타이머 해제
  if (bootTORef.current) { clearTimeout(bootTORef.current); bootTORef.current = null; }
  // ACK 보내기 (모니터링 페이지에서 받는 이벤트)
  sendToWeb('WEB_READY_ACK', { at: Date.now() });
  // 스플래시 해제
  hideSplashRespectingMin();
}, [hideSplashRespectingMin, sendToWeb]);

const handleWebError = useCallback((payload) => {
  if (bootTORef.current) { clearTimeout(bootTORef.current); bootTORef.current = null; }
  // 에러 ACK + 폴백 통지
  sendToWeb('WEB_ERROR_ACK', { ...(payload || {}), at: Date.now() });
  sendToWeb('OFFLINE_FALLBACK', { reason: payload?.reason || 'js_error', at: Date.now() });
  // 스플래시는 폴백 오버레이 역할로 그대로 유지 (원하면 유지)
}, [sendToWeb]);

  // ─────────── 권한: 알림만 ───────────
  const ensureNotificationPermission = useCallback(async () => {
    try {
      const settings = await notifee.requestPermission();
      return !!settings?.authorizationStatus;
    } catch { return false; }
  }, []);

  const replyPermissionStatus = useCallback(({ pushGranted }) => {
    sendToWeb('PERMISSION_STATUS', {
      push: { granted: !!pushGranted, blocked: false },
      token,
    });
  }, [sendToWeb, token]);



  // 최초 실행 시 알림 권한만 요청
  useEffect(() => {
    (async () => {
      const push = await ensureNotificationPermission();
      replyPermissionStatus({ pushGranted: push });
    })();
  }, [ensureNotificationPermission, replyPermissionStatus]);



  // ─────────── FCM ───────────
  useEffect(() => {
    (async () => {
      try {
        const fcmToken = await messaging().getToken();
        setToken(fcmToken);
        sendToWeb('PUSH_TOKEN', {
          token: fcmToken, platform: Platform.OS, app_version: APP_VERSION,
          install_id: 'unknown', ts: Date.now(),
        });
      } catch (e) { console.log('❌ FCM token error:', e); }
    })();

    const unsubscribe = messaging().onMessage(async (remoteMessage) => {
      sendToWeb('PUSH_EVENT', {
        event: 'received',
        title: remoteMessage.notification?.title,
        body:  remoteMessage.notification?.body,
        deeplink: remoteMessage.data?.deeplink,
        messageId: remoteMessage.messageId,
        ts: Date.now(),
      });
    });
    return () => unsubscribe();
  }, [sendToWeb]);

  // ─────────── Web → App 라우터 (권한/공유/종료만 유지) ───────────
  const handleCheckPermission = useCallback(async () => {
    const push = await ensureNotificationPermission();
    replyPermissionStatus({ pushGranted: push });
  }, [ensureNotificationPermission, replyPermissionStatus]);

  const handleRequestPermission = useCallback(async () => {
    const push = await ensureNotificationPermission();
    replyPermissionStatus({ pushGranted: push });
  }, [ensureNotificationPermission, replyPermissionStatus]);

  const onMessageFromWeb = useCallback(async (e) => {
    try {
      const raw = e.nativeEvent.data;
      if (typeof raw === 'string' && raw.startsWith('open::')) {
        const url = raw.replace('open::', '');
        try { await Linking.openURL(url); } catch {}
        return;
      }
      const data = JSON.parse(raw);
      switch (data.type) {
        case 'WEB_READY':  await handleWebReady(); break;
        case 'WEB_ERROR':  await handleWebError(data.payload); break;


        case 'CHECK_PERMISSION':    await handleCheckPermission(); break;
        case 'REQUEST_PERMISSION':  await handleRequestPermission(); break;

        case 'EXIT_APP': BackHandler.exitApp(); break;


        // 네이티브(MainActivity.onBackPressed)에서 전달되는 물리 뒤로키 이벤트
        case 'BACK_PRESSED': {

          console.log(TAG, 'BACK_PRESSED with nav=', nav);

          const nav = lastNavRef.current || {};
    
          if (nav.isRoot === true) {
            Alert.alert(
              '앱 종료',
              '앱을 종료할까요?',
              [
                { text: '취소', style: 'cancel' },
                { text: '종료', style: 'destructive', onPress: () => BackHandler.exitApp() },
              ],
              { cancelable: true }
            );
          } else {
            // 홈이 아니면 웹에 맡김
            sendToWeb('BACK_REQUEST', { nav, at: Date.now() });
          }
          break;
        }

        default: console.warn('⚠️ unknown msg:', data.type);
      }
    } catch (err) { console.error('❌ onMessage error:', err); }
  }, [handleCheckPermission, handleRequestPermission, sendToWeb]);

  // ─────────── Splash / WebView ───────────
  const showSplashOnce = useCallback(() => {
    if (!splashVisible) {
      setSplashVisible(true);
      splashFade.setValue(1);
      splashStartRef.current = Date.now();
    } else if (!splashStartRef.current) {
      splashStartRef.current = Date.now();
    }
  }, [splashFade, splashVisible]);

  const hideSplashRespectingMin = useCallback(() => {
    const elapsed = Date.now() - (splashStartRef.current || Date.now());
    const wait = Math.max(MIN_SPLASH_MS - elapsed, 0);
    setTimeout(() => {
      Animated.timing(splashFade, {
        toValue: 0, duration: 300, easing: Easing.out(Easing.quad), useNativeDriver: true,
      }).start(() => setSplashVisible(false));
    }, wait);
  }, [splashFade]);

  const onWebViewLoadStart = useCallback(() => {
    showSplashOnce();
    if (bootTORef.current) clearTimeout(bootTORef.current);
    bootTORef.current = setTimeout(() => {
      bootTORef.current = null;
      sendToWeb('OFFLINE_FALLBACK', { reason: 'timeout', at: Date.now() });
    }, BOOT_TIMEOUT_MS);
  }, [showSplashOnce, sendToWeb]);

  return (
    <SafeAreaView style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ uri: 'https://story-universe-d9b96.web.app/' }}
        onMessage={onMessageFromWeb}
        onLoadStart={onWebViewLoadStart}
        onLoadProgress={({ nativeEvent }) => {
          if (nativeEvent.progress >= 0.9) hideSplashRespectingMin();
        }}
        onLoadEnd={() => { hideSplashRespectingMin(); }}
        javaScriptEnabled
        domStorageEnabled
        focusable
        overScrollMode="never"
        containerStyle={{ backgroundColor: 'transparent' }}
        style={{ backgroundColor: 'transparent' }}
      />
      {splashVisible && (
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: splashFade, backgroundColor: 'white' }]}>
          <SplashScreenRN />
        </Animated.View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
});

export default App;
