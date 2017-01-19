uniform samplerCube Texture0;
uniform mat4 CubeMapTransform;

varying vec3 vViewNormal;
varying vec3 vViewVertex;

vec3 cubemapReflectionVector(const in mat4 transform, const in vec3 view, const in vec3 normal)
{
    vec3 lv = reflect(view, normal);
    lv = normalize(lv);
    vec3 x = vec3(transform[0][0], transform[1][0], transform[2][0]);
    vec3 y = vec3(transform[0][1], transform[1][1], transform[2][1]);
    vec3 z = vec3(transform[0][2], transform[1][2], transform[2][2]);
    mat3 m = mat3(x,y,z);
    return m*lv;
}

void main(void) {
    vec3 normal = normalize(vViewNormal);
    vec3 eye = -normalize(vViewVertex);
    vec3 ray = cubemapReflectionVector(CubeMapTransform, eye, normal);
    
#ifdef LIVE
    ray.x = - ray.x;
#endif

    gl_FragColor = textureCube(Texture0, normalize(ray));
}
