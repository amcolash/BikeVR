const fragmentShader = `
uniform sampler2D texture;
uniform float nextBlend;

varying vec2 vUv;

void main() {
    vec4 color = vec4(texture2D(texture, vUv).rgb, nextBlend);
    gl_FragColor = color;
}
`;