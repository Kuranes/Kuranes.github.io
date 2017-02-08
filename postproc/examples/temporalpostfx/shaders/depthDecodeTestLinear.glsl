// encode in one buffer / decode in another
// no more simulation, but buffer is float, so still not the real thing
// (need 8bits RTT for exact test)

// DIFF * 10 000.0 of various pack/unpack float code
//const float errorScale = 100000000.0;
uniform float errorScale;

//-------------------------------------------------------------------------
// another error graphing tech: https://www.shadertoy.com/view/XssXR4

//-------------------------------------------------------------------------

#pragma include "depthCodec"

//-------------------------------------------------------------------------
// the diff code    
//-------------------------------------------------------------------------



uniform sampler2D Texture0;
uniform vec2 RenderSize;

void main(  )
{
	vec2 uv = gl_FragCoord.xy / RenderSize.xy;
    vec2 step = 1.0 / RenderSize.xy;
    
    vec2 mouse = RenderSize.xy*0.5 ;
    
    float splitX = uv.x - (mouse.x * step.x);
    float splitY = uv.y - (mouse.y * step.y);
	
    // between [0,1[
	//vec4 signalEncoded = texture2D(Texture0, (floor(uv*RenderSize)+0.5) / RenderSize, -99999.0);
    vec4 signalEncoded = texture2D(Texture0, uv);
    

    
	float diff = 0.5;
    if (splitX < 0.0 && splitY < 0.0  )
    {
        //LOWER LEFT: IQ        
        float f = unpack_F1_UB4( signalEncoded );
        
        diff = abs(getSignal(uv*2.0) -f); 

    }
    else if (splitX < 0.0 && splitY > 0.0  )
    {
        // UPPER LEFT: gradient studios
        
        float f = unpackFloat_gradientstudios( signalEncoded );                
        diff = abs(getSignal(vec2(uv.x*2.0, (uv.y - 0.5) * 2.0)) -f); 
       
    }
     else if (splitX > 0.0 && splitY < 0.0  )
    {
        // LOWER RIGHT: ARAS_P
        
        float f = DecodeFloatRGBA_aras( signalEncoded );
        
        diff = abs(getSignal(vec2((uv.x - 0.5) * 2.0, uv.y*2.0)) -f); 
      
    }
    else if (splitX > 0.0 && splitY > 0.0  )
    {
		
        // UPPER RIGHT: osg vec2F
		float f = convertBytesToFloat(signalEncoded);
		
		
      /*  
        // UPPER RIGHT: HALF FLOAT
        vec2 f2 = decodeHalfFloatRGBA( signalEncoded );
        
        //float f = (f2.x + f2.y) * 0.5;
        float f = f2.x;
        */
		
        diff = abs(getSignal((uv - 0.5) * 2.0) - f); 
    }
         
    vec3 diff3 = vec3(diff) * errorScale;
    float splitBar = (abs(splitX - 0.001) < 0.001) || (abs(splitY - 0.001) < 0.001) ? 0.0: 1.0;
	gl_FragColor = vec4(diff3, 1.0);
	gl_FragColor.r += 1.0 - splitBar;
	//gl_FragColor = signalEncoded
}

