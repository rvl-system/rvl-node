const EMPTY_CHANNEL = {
    a: 0,
    w_t: 0,
    w_x: 0,
    phi: 0,
    b: 0,
};
function validateNum(num, min, max, name) {
    if (typeof num !== 'number' || num < min || num > max) {
        throw new Error(`Invalid ${name} ${num}. ` +
            `${name[0].toUpperCase() + name.substring(1)} must be a number between ${min} and ${max}`);
    }
}
export function createAnimationParameters(animation1, animation2, animation3, animation4) {
    return {
        animations: [
            animation1 || createEmptyAnimation(),
            animation2 || createEmptyAnimation(),
            animation3 || createEmptyAnimation(),
            animation4 || createEmptyAnimation(),
        ],
    };
}
export function createEmptyAnimation() {
    return {
        h: { ...EMPTY_CHANNEL },
        s: { ...EMPTY_CHANNEL },
        v: { ...EMPTY_CHANNEL },
        a: { ...EMPTY_CHANNEL },
    };
}
export function createSolidColorAnimation(h, s, a) {
    validateNum(h, 0, 255, 'hue');
    validateNum(s, 0, 255, 'saturation');
    validateNum(a, 0, 255, 'alpha');
    const layer = createEmptyAnimation();
    layer.h.b = Math.round(h);
    layer.s.b = Math.round(s);
    layer.v.b = 255;
    layer.a.b = Math.round(a);
    return layer;
}
export function createColorCycleAnimation(rate, a) {
    validateNum(rate, 1, 32, 'rate');
    validateNum(a, 0, 255, 'alpha');
    const layer = createEmptyAnimation();
    layer.h.a = 255;
    layer.h.w_t = Math.round(rate);
    layer.h.w_x = 0;
    layer.s.b = 255;
    layer.v.b = 255;
    layer.a.b = Math.round(a);
    return layer;
}
export function createMovingAnimation(h, s, rate, spacing) {
    validateNum(rate, 0, 32, 'rate');
    validateNum(spacing, 1, 16, 'spacing');
    validateNum(h, 0, 255, 'hue');
    validateNum(s, 0, 255, 'saturation');
    const layer = createEmptyAnimation();
    layer.h.b = Math.round(h);
    layer.s.b = Math.round(s);
    layer.v.b = 255;
    layer.a.a = 255;
    layer.a.w_t = Math.round(rate);
    layer.a.w_x = Math.round(spacing);
    return layer;
}
export function createPulsingAnimation(h, s, rate) {
    validateNum(rate, 1, 32, 'rate');
    validateNum(h, 0, 255, 'hue');
    validateNum(s, 0, 255, 'saturation');
    const layer = createEmptyAnimation();
    layer.h.b = Math.round(h);
    layer.s.b = Math.round(s);
    layer.v.b = 255;
    layer.a.w_t = Math.round(rate);
    layer.a.a = 255;
    return layer;
}
export function createRainbowAnimation(a, rate) {
    validateNum(rate, 1, 32, 'rate');
    validateNum(a, 0, 255, 'alpha');
    const layer = createEmptyAnimation();
    layer.h.a = 255;
    layer.h.w_t = Math.round(rate);
    layer.h.w_x = 2;
    layer.s.b = 255;
    layer.v.b = 255;
    layer.a.b = Math.round(a);
    return layer;
}
//# sourceMappingURL=animation.js.map