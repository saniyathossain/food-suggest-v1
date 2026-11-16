// The motion features the app uses (DOM animations, no gestures or drag), in
// their own chunk: LazyMotion fetches it after the first paint, so motion
// costs the first load nothing.
export { domAnimation as default } from 'motion/react'
