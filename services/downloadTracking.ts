import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import { firestore } from '../firebaseConfig';

export type DownloadTargetPlatform = 'android' | 'ios';
export type DownloadViewerPlatform = 'android' | 'ios' | 'desktop';
export type DownloadEventName =
  | 'banner_cta_click'
  | 'banner_close'
  | 'tutorial_android_download_click'
  | 'tutorial_copy_link_click';

const DOWNLOAD_SESSION_KEY = 'boxbox_download_session_id';
const DEFAULT_ANDROID_APK_URL =
  'https://github.com/ianadanez/boxbox-downloads/releases/latest/download/boxbox-android.apk';

export const getAndroidApkUrl = (): string =>
  (((import.meta as any).env?.VITE_ANDROID_APK_URL as string) || DEFAULT_ANDROID_APK_URL).trim();

export const detectViewerPlatform = (): DownloadViewerPlatform => {
  if (typeof window === 'undefined') return 'desktop';
  const ua = window.navigator.userAgent || '';
  if (/android/i.test(ua)) return 'android';
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
  return 'desktop';
};

const getOrCreateDownloadSessionId = (): string => {
  if (typeof window === 'undefined') return 'web-unknown';
  const existing = window.localStorage.getItem(DOWNLOAD_SESSION_KEY);
  if (existing) return existing;

  const generated =
    typeof window.crypto?.randomUUID === 'function'
      ? window.crypto.randomUUID()
      : `dl_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  window.localStorage.setItem(DOWNLOAD_SESSION_KEY, generated);
  return generated;
};

export const trackDownloadEvent = async (params: {
  eventName: DownloadEventName;
  targetPlatform: DownloadTargetPlatform;
  viewerPlatform: DownloadViewerPlatform;
  source: string;
  pagePath: string;
  userId?: string | null;
}): Promise<void> => {
  try {
    await firestore.collection('download_events').add({
      eventName: params.eventName,
      targetPlatform: params.targetPlatform,
      viewerPlatform: params.viewerPlatform,
      source: params.source,
      pagePath: params.pagePath,
      sessionId: getOrCreateDownloadSessionId(),
      userId: params.userId ?? null,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
  } catch (err) {
    console.warn('No se pudo trackear evento de descarga', err);
  }
};
