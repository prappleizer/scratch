#include <stdint.h>
#include <stddef.h>

// Convert a 32-bit float (represented as a 32-bit integer) to a 16-bit half-float.
uint16_t float32ToFloat16(uint32_t f) {
    uint16_t sign = (f >> 16) & 0x8000;
    int32_t exponent = ((f >> 23) & 0xff) - 112;
    uint16_t mantissa = (f & 0x007fffff) >> 13;
    if (exponent <= 0) { // subnormal
        return sign;
    } else if (exponent >= 31) { // Inf or NaN
        return sign | 0x7c00;
    } else {
        return sign | (exponent << 10) | mantissa;
    }
}

// Convert an array of 32-bit floats (src) to 16-bit half-floats (dst).
// The length is the number of elements.
void convertFloat32ToFloat16(const float* src, uint16_t* dst, size_t len) {
    const uint32_t* s = (const uint32_t*) src;
    for (size_t i = 0; i < len; i++) {
        dst[i] = float32ToFloat16(s[i]);
    }
}