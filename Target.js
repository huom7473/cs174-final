import {defs, tiny} from './examples/common.js';

const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Shader, Matrix, Mat4, Light, Shape, Material, Scene, Texture
} = tiny;

const {
    Phong_Shader, Subdivision_Sphere, Textured_Phong
} = defs;

export class Target {
    constructor(radius, trajectory, project) {
        this.radius = radius;
        this.center = trajectory.get_position(0);
        this.trajectory = trajectory;
        this.materials = project.materials;
        this.shapes = project.shapes;
        this.t0 = null;
        this.ct0 = null;
    }

    draw(context, program_state) {
        if (this.t0 === null)
            this.t0 = program_state.animation_time;

        const t = (program_state.animation_time - this.t0) / 1000;
        const s = 0.5 + 0.5 * Math.sin(t / 2 - Math.PI / 2);
        this.center = this.trajectory.get_position(s);

        const model_transform_outer = Mat4.translation(...this.center)
            .times(Mat4.scale(this.radius, 0.01, this.radius));
        const model_transform_inner = Mat4.translation(...(this.center.plus(vec3(0, 0.1, 0))))
            .times(Mat4.scale(this.radius / 1.75, 0.01, this.radius / 1.75));
        const model_transform_center = Mat4.translation(...(this.center.plus(vec3(0, 0.2, 0))))
            .times(Mat4.scale(this.radius / 5, 0.01, this.radius / 5));

        const red = hex_color("#ff0000");
        const green = hex_color('#00ff00');
        const target_color = this.ct0 !== null && program_state.animation_time - this.ct0 < 500 ? green : red

        this.shapes.sphere.draw(context, program_state, model_transform_outer, this.materials.plastic.override({color: target_color}));
        this.shapes.sphere.draw(context, program_state, model_transform_inner, this.materials.plastic.override({color: hex_color("#ffffff")}));
        this.shapes.sphere.draw(context, program_state, model_transform_center, this.materials.plastic.override({color: target_color}));

        if (this.ct0 !== null && program_state.animation_time - this.ct0 >= 500)
            this.ct0 = null;
    }

    collide(program_state) {
        this.ct0 = program_state.animation_time;
    }
}