// uncomment to check 0 to 1 from lower left to top right
// so that error zone spread are clear
// but don't forget to maximize the "viewport" you're checking
#define CHECK_ERROR_SPREAD
// want to test [0, 1] ?
#define RANGE_BOUND_ONE_INCLUDED

// ^^ changes need to be done in both buffer



// BLACK == no difference
// WHITE == huge difference
//
// A big decision in to do [0, 1[ or [0, 1]
// here testing [0, 1[
//


float getSignal(vec2 uvS){
     // between [0,1[
	float signal;// = 0.5 + 0.5*sin(uv.x*50.0 + sin(uv.y*50.0) )*sin(uv.y*40.0 + sin(uv.x*40.0+iGlobalTime) );
   
    // here to check where on 0,1 errors are
#ifdef CHECK_ERROR_SPREAD
	signal = cos (uvS.x*uvS.y*1.57079632679);
	//signal = cos (uvS.y*1.57079632679);
	//signal = cos (uvS.x*1.57079632679);
#endif
    
#ifndef RANGE_BOUND_ONE_INCLUDED    
    // between [0,1[    
	signal = clamp(signal, 0.0, 0.9999999999) ;    			
#else
	signal = clamp(signal, 0.0, 1.0) ;    		
#endif          
	
    return signal;
}

//-------------------------------------------------------------------------
// aras_p
// http://aras-p.info/blog/2009/07/30/encoding-floats-to-rgba-the-final/
// w/o the aras typo 255.0*255.0*255.0 != 160581375 it's 16581375

const float basePow = 255.0;
const float powTwo = basePow*basePow;
const float powThree = powTwo*basePow;

vec4 EncodeFloatRGBA_aras( const in float v ) {
  vec4 enc = vec4(1.0, basePow, powTwo, powThree) * v;
  enc = fract(enc);
  enc -= enc.yzww * vec4( 1.0/basePow, 1.0/basePow, 1.0/basePow, 0.0);
  return enc;
}

float DecodeFloatRGBA_aras(const in vec4 rgba ) {
  return dot( rgba, vec4(1.0, 1.0/basePow, 1.0/powTwo, 1.0/powThree) );
}
/// 


//-------------------------------------------------------------------------
// Created by inigo quilez - iq/2014
// License Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported License.
// https://www.shadertoy.com/view/ldj3zG
// the classic 1-32-bit-float to 4-8-bit-vec4 packing and unpacking functions that 
// have been floating around the internet for 10 years now. Unkown source, but
// common sense.

//const float basePowIQ = 256.0;
const float basePowIQ = 255.0;
const float powTwoIQ = basePowIQ*basePowIQ;
const float powThreeIQ = powTwoIQ*basePowIQ;

const vec4 bitShL = vec4(powThreeIQ, powTwoIQ, basePowIQ, 1.0);
const vec4 bitShR = vec4(1.0/powThreeIQ, 1.0/powTwoIQ, 1.0/basePowIQ, 1.0);

vec4 pack_F1_UB4( const in float value )
{
    vec4 res = fract( value*bitShL );
	res.yzw -= res.xyz / basePowIQ;
	return res;
}

float unpack_F1_UB4( const in vec4 value )
{
    return dot( value, bitShR );
}

//-------------------------------------------------------------------------
// half float precision, when you pack 2-16-bit-float to 4-8-bit-vec4 

vec4 encodeHalfFloatRGBA( const in vec2 v ) {
    const vec2 bias = vec2(1.0 / basePowIQ, 0.0);
    vec4 enc;
    enc.xy = vec2(v.x, fract(v.x * basePowIQ));
    enc.xy = enc.xy - (enc.yy * bias);

    enc.zw = vec2(v.y, fract(v.y * basePowIQ));
    enc.zw = enc.zw - (enc.ww * bias);
    return enc;
}

vec2 decodeHalfFloatRGBA( const in vec4 rgba ) {
    
    return vec2(rgba.x + (rgba.y / basePowIQ), rgba.z + (rgba.w / basePowIQ));
}

//-------------------------------------------------------------------------

// http://blog.gradientstudios.com/2012/08/23/shadow-map-improvement
// packing a float in glsl with multiplication and fract
// wip  as not clear for now what the blog post is saying

const float basePowGS = 255.0;
const float powTwoGS = basePowIQ*basePowIQ;
const float powThreeGS = powTwoIQ*basePowIQ;
// "fract is the problem"
vec4 packFloat_gradientstudios_problem( const in float depth ) {

  const vec4 bit_shift = vec4(powThreeGS, powTwoGS, basePowGS, 1.0 );
  const vec4 bit_mask  = vec4(0.0, 1.0 / basePowGS, 1.0 / basePowGS, 1.0 / basePowGS );

  vec4 res = fract( depth * bit_shift );

  res -= res.xxyz * bit_mask;
  return res;
}


// packing a float in glsl with multiplication and mod
vec4 packFloat_gradientstudios( const in float depth ) {

  const vec4 bit_shift = vec4(powThreeGS, powTwoGS, basePowGS, 1.0 );
  const vec4 bit_mask  = vec4(0.0, 1.0 / basePowGS, 1.0 / basePowGS, 1.0 / basePowGS );


  vec4 res = mod( depth * bit_shift * vec4( basePowGS ), vec4( basePowGS ) ) / vec4( basePowGS );

  res -= res.xxyz * bit_mask;
  return res;
}

float unpackFloat_gradientstudios( const in vec4 depth ) {

	vec4 bitSh = vec4(1.0 / powThreeGS, 1.0 / powTwoGS, 1.0 / basePowGS, 1.0);
	return dot(depth, bitSh);
}

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
float convertBytesToFloat(const in vec4 depth)
{
    return dot (depth, bitShROSG);
}

vec4 toRGBA(const in float z)
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
