
uniform mat4 ModelViewMatrix;
uniform mat4 ProjectionMatrix;

attribute vec3 Vertex;
attribute vec2 TexCoord0;


varying vec2 FragTexCoord0;

void main() {
    
    FragTexCoord0 = TexCoord0;

    gl_Position = ProjectionMatrix * (ModelViewMatrix * vec4(Vertex, 1.0));

}


