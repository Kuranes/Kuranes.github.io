

//-------------------------------------------------------------------------
// another error graphing tech: https://www.shadertoy.com/view/XssXR4
//-------------------------------------------------------------------------


#pragma include "depthCodec"

//-------------------------------------------------------------------------
// the encode usage
//-------------------------------------------------------------------------


uniform vec2 RenderSize;

void main(  )
{
	vec2 uv = gl_FragCoord.xy / RenderSize.xy;
    vec2 step = 1.0 / RenderSize.xy;
    
    vec2 mouse = RenderSize.xy*0.5 ;
    
    float splitX = uv.x - (mouse.x * step.x);
    float splitY = uv.y - (mouse.y * step.y);

vec4 encoded = vec4(0.6, 0.0, 0.6, 1.0);
    
    if (splitX < 0.0 && splitY < 0.0  )
    {
        //LOWER LEFT: IQ        
        encoded = pack_F1_UB4( getSignal(uv*2.0) );
        
    }
    else if (splitX < 0.0 && splitY > 0.0  )
    {
        // UPPER LEFT: gradient studios        
        encoded = packFloat_gradientstudios( getSignal(vec2(uv.x*2.0, (uv.y - 0.5) * 2.0)) );
       
    }
     else if (splitX > 0.0 && splitY < 0.0  )
    {
        // LOWER RIGHT: ARAS_P            
        encoded = EncodeFloatRGBA_aras( getSignal(vec2((uv.x - 0.5) * 2.0, uv.y*2.0)) );
      
    }
    else if (splitX > 0.0 && splitY > 0.0  )
    {
	
        // UPPER RIGHT: osg vec2F
		encoded = toRGBA(getSignal((uv - 0.5) * 2.0) ); 
        // UPPER RIGHT: HALF FLOAT        
        //encoded = encodeHalfFloatRGBA(vec2( getSignal(uvS - vec2(1.0, 1.0)) )); 
       
    }
         
    gl_FragColor = encoded;

}
