uniform samplerCube Texture0;
uniform mat4 CubeMapTransform;

varying vec3 vViewNormal;
varying vec3 vViewVertex;

float Fresnel(const in float NdotL, const in float fresnelBias, const in float fresnelPow)
{
  float facing = (1.0 - NdotL);
  return max(fresnelBias + (1.0 - fresnelBias) * pow(facing, fresnelPow), 0.0);
}

void cubemapTransformVector(const in mat4 transform, inout vec3 transVec)
{
    vec3 x = vec3(transform[0][0], transform[1][0], transform[2][0]);
    vec3 y = vec3(transform[0][1], transform[1][1], transform[2][1]);
    vec3 z = vec3(transform[0][2], transform[1][2], transform[2][2]);
    
    mat3 m = mat3(x,y,z);
    
    transVec = m*transVec;
}

void main(void) {

    vec3 normal = normalize(gl_FrontFacing ? vViewNormal : -vViewNormal );
    vec3 eye = -vViewVertex;

    
    gl_FragColor.rgb = vec3(1.0);
    gl_FragColor.a = 0.5;
        
#ifdef REFLECTIONS    

    vec3 rayFlectDir = reflect(eye, normal);
    cubemapTransformVector(CubeMapTransform, rayFlectDir);    

#ifdef LIVE  
    rayFlectDir.x = - rayFlectDir.x;       
#endif

    gl_FragColor.rgb = textureCube(Texture0, normalize(rayFlectDir)).rgb;
    
#endif




#ifdef REFRACTIONS    
  
    
    float refractiveIndex = 1.4;// 1.40 glass refraction index IOR
    eye = normalize(-eye);
    vec3 rayFractDir = - refract(eye, normal, 1.0 / refractiveIndex);
    cubemapTransformVector(CubeMapTransform, rayFractDir);
    
#ifdef LIVE    
    rayFractDir.x = - rayFractDir.x;  
#endif

    vec3 refractedCol = textureCube(Texture0, normalize(rayFractDir)).rgb;
          
#ifdef REFLECTIONS    

    float EyedotN = max(dot(eye.xyz, rayFractDir.xyz), 0.0);  
    float fresnel = Fresnel(EyedotN, 0.2, 5.0);
    
    
    gl_FragColor.rgb = refractedCol * (1.0 - fresnel) + gl_FragColor.rgb * fresnel;
    
#else
  
    gl_FragColor.rgb = refractedCol;
#endif
    
    
#endif

    
}
