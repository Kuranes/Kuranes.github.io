

vec2 decodeHalfFloatRGBA( vec4 rgba ) {
    return vec2(rgba.x + (rgba.y / 255.0), rgba.z + (rgba.w / 255.0));
}

vec4 encodeHalfFloatRGBA( vec2 v ) {
    const vec2 bias = vec2(1.0 / 255.0, 0.0);
    vec4 enc;
    enc.xy = vec2(v.x, fract(v.x * 255.0));
    enc.xy = enc.xy - (enc.yy * bias);

    enc.zw = vec2(v.y, fract(v.y * 255.0));
    enc.zw = enc.zw - (enc.ww * bias);
    return enc;
}

varying vec2 FragTexCoord0;

void main() {
    
    //gl_FragColor = vec4(0.0,0.0,1.0,1.0);
    gl_FragColor = encodeHalfFloatRGBA(FragTexCoord0);
    //gl_FragColor = vec4(FragTexCoord0.xy, 0.0, 1.0);
}