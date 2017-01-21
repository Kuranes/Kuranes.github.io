




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
//////////////////////////////////////////////////////////////////////////////////////
// see morgan mcguire trace.

void swap(inout float a, inout float b) {
    float temp = a;
    a = b;
    b = temp;
}

float distanceSquared(vec2 a, vec2 b) {
    a -= b;
    return dot(a, a);
}

// do the comlputation in clipspace (faster as less transform)
// 2D allow use DDA algo (less error)
bool ComputeReflectionInClipSpace(const in sampler2D csZBuffer,
                                    const in mat4 projectToPixelMatrix,
                                    const in vec4 projInfo,
                                    const in vec4 csZBufferSize,
                                    const in vec2 nearFar,
                                    const in vec3 csOrigin,
                                    const in vec3 csDirection,
                                  out vec2        hitPixel,
                                  out vec3        csHitvec,
                                  out int numLoop )
{
    
   vec3 clipInfo = vec3(nearFar[0]  * nearFar[1], nearFar[0] - nearFar[1], nearFar[1]);
            
    float  nearPlaneZ = nearFar[0];
    float maxRayTraceDistance =  nearFar[1];
           
    numLoop = 0;
            
  //Tweakable variables
    const float initialStepAmount = .001;

    float csZThickness= 0.0001;
                                       
    float stride=  1.0;// stride step >= 1.0
    float jitterFraction= 0.0; //jitterFraction 0-1.0
    float maxSteps = 500.0;
                                        
                                        
                                        
   // Clip ray to a near plane in 3D (doesn't have to be *the* near plane, although that would be a good idea)
    float rayLength = ((csOrigin.z + csDirection.z * maxRayTraceDistance) > nearPlaneZ) ?
        (nearPlaneZ - csOrigin.z) / csDirection.z :
        maxRayTraceDistance;
        
        /*temp*/
     rayLength = maxRayTraceDistance;
        
    vec3 csEndvec = csDirection * rayLength + csOrigin;

    // Project into screen space
    vec4 H0 = projectToPixelMatrix * vec4(csOrigin, 1.0);
    vec4 H1 = projectToPixelMatrix * vec4(csEndvec, 1.0);

    // There are a lot of divisions by w that can be turned into multiplications
    // at some minor precision loss...and we need to interpolate these 1/w values
    // anyway.
    //
    // Because the caller was required to clip to the near plane,
    // this homogeneous division (projecting from 4D to 2D) is guaranteed
    // to succeed.
    float k0 = 1.0 / H0.w;
    float k1 = 1.0 / H1.w;

    // Switch the original vecs to values that interpolate linearly in 2D
    vec3 Q0 = csOrigin * k0;
    vec3 Q1 = csEndvec * k1;

    // Screen-space endvecs
    vec2 P0 = H0.xy * k0;
    vec2 P1 = H1.xy * k1;

    // [Optional clipping to frustum sides here]

    // Initialize to off screen
    hitPixel = vec2(-1.0, -1.0);


    // If the line is degenerate, make it cover at least one pixel
    // to avoid handling zero-pixel extent as a special case later
    P1 += vec2((distanceSquared(P0, P1) < 0.0001) ? 0.01 : 0.0);

    vec2 delta = P1 - P0;

    // Permute so that the primary iteration is in x to reduce
    // large branches later
    bool permute = false;
    if (abs(delta.x) < abs(delta.y)) {
        // More-vertical line. Create a permutation that swaps x and y in the output
        permute = true;

        // Directly swizzle the inputs
        delta = delta.yx;
        P1 = P1.yx;
        P0 = P0.yx;
    }

    // From now on, "x" is the primary iteration direction and "y" is the secondary one

    float stepDirection = sign(delta.x);
    float invdx = stepDirection / delta.x;
    vec2 dP = vec2(stepDirection, invdx * delta.y);

    // Track the derivatives of Q and k
    vec3 dQ = (Q1 - Q0) * invdx;
    float   dk = (k1 - k0) * invdx;

    // Scale derivatives by the desired pixel stride
    dP *= stride; dQ *= stride; dk *= stride;

    // Offset the starting values by the jitter fraction
    P0 += dP * jitterFraction; Q0 += dQ * jitterFraction; k0 += dk * jitterFraction;

    // Slide P from P0 to P1, (now-homogeneous) Q from Q0 to Q1, and k from k0 to k1
    vec3 Q = Q0;
    float  k = k0;

    // We track the ray depth at +/- 1/2 pixel to treat pixels as clip-space solid
    // voxels. Because the depth at -1/2 for a given pixel will be the same as at
    // +1/2 for the previous iteration, we actually only have to compute one value
    // per iteration.
    float prevZMaxEstimate = csOrigin.z;
    float stepCount = 0.0;
    float rayZMax = prevZMaxEstimate, rayZMin = prevZMaxEstimate;
    float sceneZMax = rayZMax + 1e4;

    // P1.x is never modified after this vec, so pre-scale it by
    // the step direction for a signed comparison
    float end = P1.x * stepDirection;

    // We only advance the z field of Q in the inner loop, since
    // Q.xy is never used until after the loop terminates.

    vec2 P = P0;
    
    
    for (int kStep = 0; kStep < 1000; kStep++) {

         
        if (!(((P.x * stepDirection) <= end) &&
             (stepCount < maxSteps) &&
             ((rayZMax < sceneZMax - csZThickness) ||
              (rayZMin > sceneZMax)) &&
              (sceneZMax != 0.0))){         
            return false;
       }

        hitPixel = permute ? P.yx : P;

        // The depth range that the ray covers within this loop
        // iteration.  Assume that the ray is moving in increasing z
        // and swap if backwards.  Because one end of the interval is
        // shared between adjacent iterations, we track the previous
        // value and then swap as needed to ensure correct ordering
        rayZMin = prevZMaxEstimate;

        // Compute the value at 1/2 pixel into the future
        rayZMax = (dQ.z * 0.5 + Q.z) / (dk * 0.5 + k);
        prevZMaxEstimate = rayZMax;
        if (rayZMin > rayZMax) { swap(rayZMin, rayZMax); }

        // Camera-space z of the background
        sceneZMax = getDepth(csZBuffer, hitPixel);

        P += dP; Q.z += dQ.z; k += dk; stepCount += 1.0;
         numLoop = kStep;
    } // pixel on ray

    Q.xy += dQ.xy * stepCount;
    csHitvec = Q * (1.0 / k);


    // Matches the new loop condition:
    return (rayZMax >= sceneZMax - csZThickness) && (rayZMin <= sceneZMax);
}
////////////////////////////////////////////////////////////////////////////////////////////////////

uniform sampler2D Texture0;
uniform sampler2D Texture1;
uniform sampler2D Texture2;
uniform samplerCube Texture6;

uniform mat4 ProjectionMatrix;
uniform vec4 renderSize;
uniform vec2 NearFar;

varying vec4 FragNormal;
varying vec4 FragPosition;
varying vec2 FragTexCoord0;

void main (void)
{


    vec4 projInfo = vec4(-2.0 / (renderSize.x*ProjectionMatrix[0][0]),
                        -2.0 / (renderSize.y*ProjectionMatrix[1][1]),
                        ( 1.0 - ProjectionMatrix[0][2]) / ProjectionMatrix[0][0],
                        ( 1.0 + ProjectionMatrix[1][2]) / ProjectionMatrix[1][1]);
                        
   vec3 screenSpacePosition;
   screenSpacePosition = convertCameraSpaceToScreenSpace(FragPosition.xyz, ProjectionMatrix);

   vec3 position = getPosition(gl_FragCoord.xy * renderSize.zw, Texture1, projInfo);
   
   if (position.z > (screenSpacePosition.z) - 0.0001)
   {  

       vec4 reflection = vec4(0.0, 0.0, 1.0, 0.0);
                        
      //  camera space vectors
      vec3 csOrigin = FragPosition.xyz;
      vec3 cameraSpaceNormal = normalize(gl_FrontFacing ? FragNormal.xyz : -FragNormal.xyz );
      vec3 cameraSpaceViewDir = normalize(csOrigin);
      vec3 csDirection = normalize(reflect(cameraSpaceViewDir, cameraSpaceNormal));
      
      
      int  numLoop;
      vec2 hitPixel;
      vec3 csHitvec;
            
      bool isHit = dot(cameraSpaceViewDir, csDirection) > 0.0;
      
      //#define CS_COMPUTE                          
      #ifndef CS_COMPUTE

          isHit = isHit && ComputeReflectionInCameraSpace(
                                       Texture1,
                                       ProjectionMatrix,
                                       projInfo,
                                      renderSize,
                                      NearFar,
                                      csOrigin,
                                      csDirection, 
                                      hitPixel,
                                      csHitvec,
                                      numLoop);
        #else
        
        vec2 nearFarNeg = - NearFar;
        nearFarNeg[0] = -0.00001;
            //2D DDA                                                   
            isHit = isHit && ComputeReflectionInClipSpace( Texture1,
                                       ProjectionMatrix,
                                       projInfo,
                                      renderSize,
                                      nearFarNeg,
                                      csOrigin,
                                      csDirection, 
                                      hitPixel,
                                      csHitvec,
                                      numLoop );
         #endif
         
        if (isHit)
        {                                   
           gl_FragColor.rgb  = texture2D(Texture2,  hitPixel.xy).rgb;            
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
   else{
       // don't draw over anything
    gl_FragColor.a = .0;
   }



}
