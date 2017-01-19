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
