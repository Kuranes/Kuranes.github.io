function diff (a, b, length) {
  var res = new Uint8ClampedArray(length * 4);
  var maxDiff = 0.0;
  var minDiff = 1000.0;
    for (var i = 0; i < length*4; i += 4) {        
      res[i] = Math.abs(a[i] - b[i]);
      
      maxDiff = Math.max(res[i], maxDiff);
      minDiff = Math.min(res[i], minDiff);
      
      res[i+1] = Math.abs(a[i+1] - b[i+1]);
      maxDiff = Math.max(res[i+1], maxDiff);
      minDiff = 0.0, Math.min(res[i+1], minDiff);     
      
      res[i+2] = Math.abs(a[i+2] - b[i+2]);
      
      maxDiff = Math.max(res[i+2], maxDiff);
      minDiff = Math.min(res[i+2], minDiff);
      
      res[i+3] = Math.abs(255 - Math.abs(a[i+3] - b[i+3]));
      maxDiff = Math.max(res[i+3], maxDiff);
      minDiff = Math.min(res[i+3], minDiff);
    }
    console.log(maxDiff, minDiff);
    
    postMessage(res);
}
  
onmessage = function(event) {
    
    diff(event.data.a, event.data.b, event.data.length);
    
};