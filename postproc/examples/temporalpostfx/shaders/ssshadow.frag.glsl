




#ifdef GL_FRAGMENT_PRECISION_HIGH
 precision highp float;
precision highp int;
 #else
 precision mediump float;
precision mediump int
#endif

#extension GL_OES_standard_derivatives : require

//-------------------------------------------------------------------------
// https://github.com/cedricpinson/osg/blob/master/src/osgPlugins/text2vert32/ReaderWriterT2V.cpp

const float basePowOSG = 256.0;
const float baseShiftOSG = 255.0;
const float powTwoOSG = basePowOSG*basePowOSG;
const float powThreeOSG = powTwoOSG*basePowOSG;
const float powFourOSG = powThreeOSG*basePowOSG;

const vec4 bitShLOSG = vec4(basePowOSG, powTwoOSG, powThreeOSG, powFourOSG);
const vec4 bitShROSG = vec4(baseShiftOSG / basePowOSG, baseShiftOSG / powTwoOSG, baseShiftOSG / powThreeOSG, baseShiftOSG / powFourOSG);

///////////////////////////////////
float decodeFloatRGBA(const in vec4 depth)
{
    return dot (depth, bitShROSG);
}

vec4 encodeFloatRGBA(const in float z)
{	
	// doesn't work because depth is not the same at each succesive byte
    //return floor(fract(vec4(z)*bitShLOSG))/ baseShiftOSG; 
	
	// so no vectorized code it is
	vec4 rgba;
		
    rgba.x = z * basePowOSG;	
    rgba.y = fract(rgba.x) * basePowOSG;	
    rgba.z = fract(rgba.y) * basePowOSG;	
    rgba.w = fract(rgba.z) * basePowOSG;
	   
    return floor(rgba) / baseShiftOSG;
}

///////////////////////////////////
vec2 decodeHalfFloatRGBA(const in vec4 rgba)
{
   return vec2(dot (rgba.xy, bitShROSG.xy), dot (rgba.zw, bitShROSG.xy) );
}

vec4 encodeHalfFloatRGBA(const in vec2  v)
{	
	// so no vectorized code it is
	vec4 rgba;
		
    rgba.x = v.x * basePowOSG;	
    rgba.y = fract(rgba.x) * basePowOSG;	
	
    rgba.z = v.y * basePowOSG;	
    rgba.w = fract(rgba.z) * basePowOSG;
	   
    return floor(rgba) / baseShiftOSG;
}

///////////////////////////////////



float getDepth(const in sampler2D tex, const in vec2 uv)
{
    float depth = decodeFloatRGBA(texture2D(tex, uv));

    return depth;
}

vec3 reconstructNormalCS(const in vec3 position)
{
    //return normalize(vec3(dFdx(Depth) * 500.0, dFdy(Depth) * 500.0, 1.0)) * 0.5 + 0.5;
    return normalize(cross(dFdx(position), dFdy(position)));
}

// zbuffer to clips space Z
vec3 reconstructCSPosition(vec2 S, float z, vec4 projInfo) {
    return vec3((S.xy * projInfo.xy + projInfo.zw) * z, z);
}

/// from depth texture to clipSpace positions
vec3 getPosition(const vec2 uv, const sampler2D tex, const vec4 projInfo)
{
  float depth = decodeFloatRGBA(texture2D(tex, uv));
  vec3 Position = reconstructCSPosition(uv, depth, projInfo);
  return Position;

}

//Convert something in camera space to screen space
vec3 convertCameraSpaceToScreenSpace(const in vec3 cameraSpace, const in mat4 projectToPixelMatrix)
{
  vec4 clipSpace = projectToPixelMatrix * vec4(cameraSpace, 1.0);
  
  vec3 NDCSpace = clipSpace.xyz / clipSpace.w;
  vec3 screenSpace = 0.5 * NDCSpace + 0.5;
  return screenSpace;
}

#define NUM_LOOP 500

///////////////////////////////////////////////////////////////////
bool ComputeReflectionInCameraSpace(const in sampler2D csZBuffer,
                                    const in mat4 projectToPixelMatrix,
                                    const in vec4 projInfo,
                                    const in vec4 csZBufferSize,
                                    const in vec2 nearFar,
                                    const in vec3 csOrigin,
                                    const in vec3 csDirection,
                                  out vec2        hitPixel,
                                  out vec3        csHitvec,
                                  out int numLoop)
{
  //Tweakable variables
  const float initialStepAmount = 1.0 / float(NUM_LOOP);
  
  numLoop = 0;

  // camera space
  vec3 screenSpacePosition = convertCameraSpaceToScreenSpace(csOrigin, projectToPixelMatrix);
  //Screen space vector
  vec3 csDirectionPosition = csOrigin + csDirection;
  vec3 screenSpaceVectorPosition = convertCameraSpaceToScreenSpace(csDirectionPosition, projectToPixelMatrix);
  vec3 screenSpaceVector = initialStepAmount * normalize(screenSpaceVectorPosition - screenSpacePosition);

  //Jitter the initial ray
  //float randomOffset1 = clamp(rand(gl_FragCoord.xy),0,1)/1000.0;
  //float randomOffset2 = clamp(rand(gl_FragCoord.yy),0,1)/1000.0;
  //screenSpaceVector += vec3(randomOffset1,randomOffset2,0);
  
  vec3 oldPosition = screenSpacePosition;
  vec3 sampleRay = oldPosition + screenSpaceVector;

  //State
  vec4 color = vec4(0.,0.,0.,0.);
  
  int numRefinements = 0;
  //Ray trace!
  float error = screenSpaceVector.z;
  bool bFoundIntersection = false;
   for(int count = 0; count < NUM_LOOP; count++)
   {
          numLoop = count;
        
      //Stop ray trace when it goes outside screen space
      if(
            sampleRay.x <= 0. || sampleRay.x >= 1. 
         || sampleRay.y <= 0. || sampleRay.y >= 1. 
         || sampleRay.z <= 0. || sampleRay.z >= 1.
        ){
          return false;
       }

      //intersections
      // where ray depth should be and where ray depth is really      
      float realDepth = getDepth( csZBuffer, sampleRay.xy );       
      float diff = sampleRay.z - realDepth  ;
      if(
      diff >= 0.0 
         && realDepth > 0.0 
         && realDepth < 1.0  
        // && realDepth >= error 
         && realDepth <= sampleRay.z
        // && diff < error
        ){
        
         if( realDepth < oldPosition.z - screenSpaceVector.z) return false;
            
        bFoundIntersection = true;   
        break;             
      }
      //Step ray
      oldPosition = sampleRay;
      sampleRay = oldPosition + screenSpaceVector;

  }
  #define NUM_BINARY_SEARCH_SAMPLES 6
  if (bFoundIntersection)
  {
        vec3 MinRaySample = oldPosition;
        vec3 MaxRaySample = sampleRay;
        vec3 MidRaySample;
        float diff;
        for (int i = 0; i < NUM_BINARY_SEARCH_SAMPLES; i++)
        {

            MidRaySample = mix(MinRaySample, MaxRaySample, 0.5);
            float ZBufferVal = getDepth( csZBuffer, MidRaySample.xy);
            diff = MidRaySample.z - ZBufferVal;
            if (diff > 0.0)
                MaxRaySample = MidRaySample;
            else
                MinRaySample = MidRaySample;
                
            numLoop++;
        }
        MidRaySample = mix(MinRaySample, MaxRaySample,diff);    
        
        hitPixel = MidRaySample.xy;
       //csHitvec = getPosition(MidRaySample.xy, csZBuffer, projInfo);
        return true;
    }
  
  numLoop = NUM_LOOP;
  return false;
}

uniform sampler2D Texture0;
uniform sampler2D Texture1;
uniform sampler2D Texture2;
uniform sampler2D Texture3;
uniform sampler2D Texture4;

uniform mat4 ProjectionMatrix;
uniform mat4 SceneProjectionMatrix;

uniform vec4 renderSize;
uniform vec2 NearFar;
uniform vec4 lightViewDir;

void main (void)
{


    vec4 projInfo = vec4(-2.0 / (renderSize.x*SceneProjectionMatrix[0][0]),
                        -2.0 / (renderSize.y*SceneProjectionMatrix[1][1]),
                        ( 1.0 - SceneProjectionMatrix[0][2]) / SceneProjectionMatrix[0][0],
                        ( 1.0 + SceneProjectionMatrix[1][2]) / SceneProjectionMatrix[1][1]);
                  
                       
      //  camera space vectors
     vec3 csOrigin = convertCameraSpaceToScreenSpace(getPosition(gl_FragCoord.xy * renderSize.zw, Texture0, projInfo), SceneProjectionMatrix);
     vec3 csNormal = reconstructNormalCS(csOrigin);      
     
     vec3 csDirection = normalize(reflect(lightViewDir.xyz, csNormal)) ;                        
     //vec3 cameraSpaceViewDir = normalize(csOrigin);
      
      //gl_FragColor.rgb = normalize(lightViewDir.xyz)* 0.5 + 0.5;
     // gl_FragColor.rgb  = csDirection  * 0.5 + 0.5;
         // gl_FragColor.rgb  = csNormal*0.5+0.5;
           //gl_FragColor.rgb  = vec3(csOrigin.x * 0.5 + 0.5, csOrigin.y * 0.5 + 0.5, (csOrigin.z - NearFar[0] )/ (NearFar[1]- NearFar[0]));            
           gl_FragColor.rgb  = vec3(csOrigin.x, csOrigin.y, csOrigin.z*100.0);            
          gl_FragColor.a = 1.0;
     return;
      
      int  numLoop;
      vec2 hitPixel;
      vec3 csHitvec;
            
      bool isHit = false;
      
          isHit = ComputeReflectionInCameraSpace(
                                       Texture3,
                                       SceneProjectionMatrix,
                                       projInfo,
                                      renderSize,
                                      NearFar,
                                      csOrigin,
                                      csDirection, 
                                      hitPixel,
                                      csHitvec,
                                      numLoop);
      
        if (isHit)
        {                                   
           gl_FragColor.rgb  = vec3(1.0);            
           gl_FragColor.a = 1.0;
        }
        else{
           
           
           gl_FragColor.rgb = vec3(1.0, 0.0, float(numLoop) / float(NUM_LOOP));//exture2D(Texture0, FragTexCoord0).rgb;
                         
           
           //reflection fallback cube map 
           //gl_FragColor.rgb = textureCube(Texture6, csDirection).rgb*0.25;
           
           // debug gray
           //gl_FragColor.rgb = vec3(0.2,0.2,0.2);;//exture2D(Texture0, FragTexCoord0).rgb;
           
           gl_FragColor.a = 1.0;
       }




}
