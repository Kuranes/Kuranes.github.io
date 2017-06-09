

float Dither_FindPattern(int x, int y) {
    if (y == 0) {
        if (x<4) {
            if (x == 0) return 0.015625;
            if (x == 1) return 0.515625;
            if (x == 2) return 0.140625;
            return 0.640625;
        }
        
        if (x == 4) return 0.046875;
        if (x == 5) return 0.546875;
        if (x == 6) return 0.171875;
        return 0.671875;
    }
    
    if (y == 1) {
        if (x<4) {
            if (x == 0) return 0.765625;
            if (x == 1) return 0.265625;
            if (x == 2) return 0.890625;
            return 0.390625;
        }
        
        if (x == 4) return 0.796875;
        if (x == 5) return 0.296875;
        if (x == 6) return 0.921875;
        return 0.421875;
    }
    
    if (y == 2) {
        if (x<4) {
            if (x == 0) return 0.203125;
            if (x == 1) return 0.703125;
            if (x == 2) return 0.078125;
            return 0.578125;
        }
        
        if (x == 4) return 0.234375;
        if (x == 5) return 0.734375;
        if (x == 6) return 0.109375;
        return 0.609375;
    }
    
    if (y == 3) {
        if (x<4) {
            if (x == 0) return 0.953125;
            if (x == 1) return 0.453125;
            if (x == 2) return 0.828125;
            return 0.328125;
        }
        
        if (x == 4) return 0.984375;
        if (x == 5) return 0.484375;
        if (x == 6) return 0.859375;
        return 0.359375;
    }
    
    if (y == 4) {
        if (x<4) {
            if (x == 0) return 0.0625;
            if (x == 1) return 0.5625;
            if (x == 2) return 0.1875;
            return 0.6875;
        }
        
        if (x == 4) return 0.03125;
        if (x == 5) return 0.53125;
        if (x == 6) return 0.15625;
        return 0.65625;
    }
    
    if (y == 5) {
        if (x<4) {
            if (x == 0) return 0.8125;
            if (x == 1) return 0.3125;
            if (x == 2) return 0.9375;
            return 0.4375;
        }
        
        if (x == 4) return 0.78125;
        if (x == 5) return 0.28125;
        if (x == 6) return 0.90625;
        return 0.40625;
    }
    
    if (y == 6) {
        if (x<4) {
            if (x == 0) return 0.25;
            if (x == 1) return 0.75;
            if (x == 2) return 0.125;
            return 0.625;
        }
        
        if (x == 4) return 0.21875;
        if (x == 5) return 0.71875;
        if (x == 6) return 0.09375;
        return 0.59375;
    }
    
    if (x<4) {
        if (x == 0) return 1.0;
        if (x == 1) return 0.5;
        if (x == 2) return 0.875;
        return 0.375;
    }
    
    if (x == 4) return 0.96875;
    if (x == 5) return 0.46875;
    if (x == 6) return 0.84375;
    return 0.34375;
}

vec3 Dither_Colour(vec2 pos, vec3 col) {
    //determine the x/y dither pattern
    ivec2 xy = ivec2(floor(mod(pos, 8.0)));
    
    //we apply the dither on each colour bit
    float ditherLimit = Dither_FindPattern(xy.x, xy.y);
    
    vec3 colFraction = mod(col*255.0, 1.0);
    vec3 finalCol = col-(colFraction/255.0);
    
    if (colFraction.r >= ditherLimit) {
        finalCol.r += 0.00390625*100.0; // 1/256
    }
    
    if (colFraction.g >= ditherLimit) {
        finalCol.g += 0.00390625*100.0; // 1/256
    }
    
    if (colFraction.b >= ditherLimit) {
        finalCol.b += 0.00390625*100.0; // 1/256
    }
    
    return finalCol;
}

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





/*
//-----------------------------------------------------------------------------
// Corner plenoptic view
//-----------------------------------------------------------------------------
void  renderPlenopticView(vec2 fX )
{
  vec2 cX   = 1.0 - vec2(subImgIdx) / vec2(plenImgNum) - (1 / vec2(plenImgNum) * 0.5);
  float aR  = min(plenImgNum.x,plenImgNum.y);

  aR = 1.0 / aR / 2.0;
  aR = max(aptDiameter * 0.5,aR);

  cX -= fX;

  finalColor  = texture(uTexture0,fX); 

  if (length(cX) &lt; aR)
    finalColor.y  = 1;  
    
}
http://www.rattansoftware.com/applications/aperture/
//-----------------------------------------------------------------------------
// Synthetic Aperture Focus
vec3  renderFocusView(const in sampler2D lightField, const in vec2 screenUV, const in vec2 uv, const in vec2 fieldNum )
{
    vec2  subImgSize = subImgSize
    ivec2 plenImgNum = ivec2(fieldNum);
    
    vec2    fx    = screenUV * vec2(fieldNum); // convert to image space (0,0 to image size)
    ivec2   aRad  = ivec2(fieldNum * aptDiameter * 0.5);
    ivec2   bIdx  = subImgIdx - aRad;
    ivec2   eIdx  = subImgIdx + aRad;
    vec4    clr   = vec4(0); 
    float   n     = 0;
    ivec2   idx;   

    bIdx = clamp(bIdx, ivec2(0),plenImgNum - 1);
    eIdx = clamp(eIdx, ivec2(0),plenImgNum - 1);

    for (idx.y = 0;idx.y < plenImgNum.y; idx.y++)   // row
    {
        if (idx.y >= 0 && idx.y <= eIdx.y)
        {
            for (idx.x = bIdx.x;idx.x <= plenImgNum.x; idx.x++) // column
            {
                if (idx.x >= bIdx.x && idx.x <= eIdx.x)
                {
                    int   i   = (idx.y * plenImgNum.x) + idx.x;
                    vec2  dx  = vec2(idx) / vec2(plenImgNum);    // location of subimage within plenoptic image
                    vec2  lfx = vec2(mH[i] * vec4(fx,0,1));      // apply homography

                    lfx /= vec2(subImgSize);                   // convert back to texture space
                    lfx /= vec2(plenImgNum);                   // offset within subimage
                    dx   += lfx;                               // add location of subimage

                    clr  += texture2D(lightField, dx).rgb;             // running sum of color
                    n++;
                }
            }
        }
    }

    vec3  finalColor = clr / n;
    
    return finalColor:
}
*/
//-----------------------------------------------------------------------------
// Basic interpol
// perform a linear interpolation between the two textures
//-----------------------------------------------------------------------------
vec3 renderInterpolView(const in sampler2D lightField, const in vec2 screenUV, const in vec2 uv, const vec2 fieldNum)
{


    vec2 dirVec = (screenUV - uv)*(-1.0, 1.0) + (0.5,0.5);
    
    vec2 uvOffset = screenUV/fieldNum;
    vec2 dirScale = dirVec * fieldNum;
    
    vec2 minDir = floor(dirScale) / fieldNum;
    vec2 maxDir = ceil(dirScale) / fieldNum;
    vec2 weight = fract(dirScale);
    
    vec3 colour1 = texture2D(lightField, minDir + uvOffset).rgb;
    vec3 colour2 = texture2D(lightField, vec2(minDir.x, maxDir.y) + uvOffset).rgb;
    vec3 colour3 = texture2D(lightField, vec2(maxDir.x, minDir.y) + uvOffset).rgb;
    vec3 colour4 = texture2D(lightField, maxDir + uvOffset).rgb;
  
    vec3 colorDiag =  mix(mix(colour1, colour3, weight.x), mix(colour2, colour4, weight.x), weight.y);
      /*
    vec3 colour6 = texture2D(lightField, vec2(0.0, maxDir.y) + uvOffset).rgb;
    vec3 colour7 = texture2D(lightField, vec2(0.0, minDir.y) + uvOffset).rgb;
    vec3 colorCrossY = mix(colour6, colour7, weight.y * 0.5);
    
    vec3 colour8 = texture2D(lightField, vec2(minDir.x, 0.0) + uvOffset).rgb;
    vec3 colour9 = texture2D(lightField, vec2(maxDir.x, 0.0) + uvOffset).rgb;
    vec3 colorCrossX = mix(colour8, colour9, weight.x *0.5);
    
        
    vec3 colour0 = texture2D(lightField, uvOffset).rgb;
    
    return (colour0 + colorCrossX + colorCrossY + colorDiag) / 4.0;
    */
    return colorDiag;
}

// render https://github.com/tatsy/LightField/blob/master/shaders/lightfield.frag
vec3 renderBis(const in sampler2D lightField, const in vec2 screenUV, const in vec2 uv, const vec2 fieldNum) 
{
    float cameraPositionX = uv.x;
    float cameraPositionY = uv.y; 
    float apertureSize = 0.5;
    float focusPoint = 0.5;

    int cols = int(fieldNum.x);
    int rows = int(fieldNum.y);
    float fCols = fieldNum.x;
    float fRows = fieldNum.y;
	float spanX = 1.0 / fCols;
	float spanY = 1.0 / fRows;
    
    float cameraIndexX = cameraPositionX * (fCols - 1.0);
    float cameraIndexY = cameraPositionY * (fRows - 1.0);
    
    float gapRatio = 8.0;

    float cameraGapX = gapRatio / (fCols - 1.0);
    float cameraGapY = gapRatio / (fRows - 1.0);
    float initCameraX = -cameraGapX * (fCols - 1.0) * 0.5;
    float initCameraY = -cameraGapY * (fRows - 1.0) * 0.5;
    float focusRatio = 10.0 * gapRatio;

    float centerCameraX = initCameraX + cameraIndexX * cameraGapX;
    float centerCameraY = initCameraY + cameraIndexY * cameraGapY;
    float focusPointRatio = 1.0 + focusPoint / focusRatio;

    vec4 color = vec4(0.0, 0.0, 0.0, 0.0);
    int  validPixelCount = 0;
    for (int i = 0; i < rows; i++) 
    {
            for (int j = 0; j < cols; j++) 
            {
                    float cameraX = initCameraX + float(j) * cameraGapX;
                    float cameraY = initCameraY + float(i) * cameraGapY;
                    float dx = cameraX - centerCameraX;
                    float dy = cameraY - centerCameraY;
                    
                    if (dx * dx + dy * dy < apertureSize) 
                    {
                    
                            float projX   = 2.0 * screenUV.x - 1.0;
                            float projY   = 2.0 * screenUV.y - 1.0;
                            
                            float pixelX = cameraX + (projX - cameraX) * focusPointRatio;
                            float pixelY = cameraY + (projY - cameraY) * focusPointRatio;
                            float px = 0.5 * pixelX + 0.5;
                            float py = 0.5 * pixelY + 0.5;
                            
                            if(px >= 0.0 && py >= 0.0 && px < 1.0 && py < 1.0) 
                            {
                                    vec2 V;
                                    V.x = float(j) * spanX + px * spanX;
                                    V.y = float(i) * spanY + py * spanY;
                                    color = color + texture2D(lightField, V);
                                    validPixelCount++;
                            }
                  }
            }
    }
    color = color / float(validPixelCount);
    return color.rgb;
}



varying vec2 FragTexCoord0;
uniform vec2 RenderSize; // screen size

uniform sampler2D Texture0; // scene
uniform sampler2D Texture1; // lightfield

uniform vec2 uvScale;
uniform vec2 texSize;// lightfieldSize

void main() {
    
    vec2 uvScreen =  gl_FragCoord.xy / RenderSize;
    
    vec2 targetUV = clamp(decodeHalfFloatRGBA(texture2D(Texture0, FragTexCoord0.xy)), 0.0, 1.0);

    //gl_FragColor = vec4(targetUV.xy, 0.0 , 1.0);
    //gl_FragColor = vec4(    FragTexCoord0.xy, 0.0 , 1.0);
    //gl_FragColor = vec4(    uvScreen.xy, 0.0 , 1.0);
    //gl_FragColor = vec4(uvScreen.x > 0.5 ? texture2D(Texture1, uvScreen.xy).xyz : texture2D(Texture0, uvScreen.xy).xyz, 1.0);
    //gl_FragColor = vec4(texture2D(Texture0, uvScreen.xy).xyz, 1.0);
    //gl_FragColor = vec4( texture2D(Texture1, FragTexCoord0.xy).xyz , 1.0);
    
//return;
     
    // OUT
    if (targetUV.x==0.0 || targetUV.y==0.0 || targetUV.x==1.0 || targetUV.y==1.0) {
        
        //gl_FragColor = vec4(0.0,0.0,0.0,0.0);
        discard;

    }
    
    //perform a linear interpolation between the two textures
    //vec3 colour = renderInterpolView(Texture1, FragTexCoord0.xy, targetUV, texSize / uvScale);
    //perform a linear interpolation between the two textures
    vec2 sampleUV = vec2(targetUV.x, 1.0 -targetUV.y);
    vec2 dirVec = (sampleUV - FragTexCoord0)*(-1.0, 1.0) + (0.5,0.5);
    
    vec2 uvOffset = sampleUV/uvScale;
    vec2 dirScale = dirVec * uvScale;
    
    vec2 minDir = floor(dirScale) / uvScale;
    vec2 maxDir = ceil(dirScale) / uvScale;
    vec2 weight = fract(dirScale);
    
    vec3 colour1 = texture2D(Texture1, minDir + uvOffset).rgb;
    vec3 colour2 = texture2D(Texture1, vec2(minDir.x, maxDir.y) + uvOffset).rgb;
    vec3 colour3 = texture2D(Texture1, vec2(maxDir.x, minDir.y) + uvOffset).rgb;
    vec3 colour4 = texture2D(Texture1, maxDir + uvOffset).rgb;
    
    vec3 colour = mix(mix(colour1, colour3, weight.x), mix(colour2, colour4, weight.x), weight.y);
    
    
    gl_FragColor = vec4(colour, 1.0);

}
