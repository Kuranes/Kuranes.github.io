uniform samplerCube Texture0;

varying vec3 vViewNormal;
varying vec3 vLocalVertex;

void main(void) {
    vec3 eye = -normalize(vLocalVertex);

#ifdef LIVE
    eye.x = - eye.x;
#endif
    
    gl_FragColor = textureCube(Texture0, eye);
}
