import {Dimensions, PixelRatio} from 'react-native'

const BASE_WIDTH = 390 // iPhone 14 logical width
const {width} = Dimensions.get('window')
const widthScale = width / BASE_WIDTH

/**
 * Scale a dp (device-independent pixel) value proportional to screen width.
 * Use for padding, margins, icon sizes.
 */
export function dp(size: number): number {
	return Math.round(size * widthScale)
}

/**
 * Scale a font size for screen width AND system font-size accessibility setting.
 */
export function sp(size: number): number {
	return Math.round(size * widthScale * PixelRatio.getFontScale())
}
