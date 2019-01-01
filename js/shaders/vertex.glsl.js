const vertexShader = /*glsl*/ `
uniform sampler2D displace;			
varying vec2 vUv;

void main() {
    // Pass uv to fragment
    vUv = uv;

    float df = 20.0 * texture2D(displace, uv).r;
    vec4 displacedPosition = vec4(normal * df, 0.0) + vec4(position, 1.0) / 250.0;

    // Clear out ripples at base center
    displacedPosition.y = max(-1.4, displacedPosition.y);

    gl_Position = projectionMatrix * modelViewMatrix * displacedPosition;
}
`;