attribute vec3 Vertex;
attribute vec3 Normal;
uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;
uniform mat4 uModelViewNormalMatrix;

varying vec3 vViewNormal;
varying vec3 vViewVertex;
varying vec3 vLocalVertex;

void main(void) {
    
    vViewNormal = vec3(uModelViewNormalMatrix * vec4(Normal, 0.0));

    vLocalVertex = Vertex;    
    vec4 vertexModelView = uModelViewMatrix * vec4(Vertex,1.0);
    vViewVertex = vertexModelView.xyz;
    
    gl_Position = uProjectionMatrix * vertexModelView;
    
}
