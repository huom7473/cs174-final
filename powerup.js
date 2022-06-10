import {defs, tiny} from './examples/common.js';

const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Shader, Matrix, Mat4, Light, Shape, Material, Scene, Texture
} = tiny;

const {
    Phong_Shader, Subdivision_Sphere, Textured_Phong
} = defs;


export class PowerUp {
    constructor(radius, center, effect, project ) {
        this.radius = radius;
        this.center = center;
        this.materials = project.materials;
        this.shapes = project.shapes;
        this.t0 = null;
        this.valid = true;
        this.effect = effect;
    }

    draw(context, program_state) {
        if (!this.valid) return;

        if (this.t0 === null)
            this.t0 = program_state.animation_time;

        const blue = hex_color('#2020ff');

        const model_transform = Mat4.translation(...this.center).times(Mat4.scale(this.radius, this.radius, this.radius));
        this.shapes.sphere.draw(context, program_state, model_transform, this.materials.plastic.override({color: blue}));
    }

    try_colliding_with_plane(plane_center, plane_radius) {
        if (this.valid && this.center.minus(plane_center).norm() < plane_radius + this.radius) {
            this.valid = false;
            this.effect();
            return true;
        }
        return false;
    }
}