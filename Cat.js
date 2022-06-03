import {PhysicsObject} from "./PhysicsObject.js";
import {defs, tiny} from './examples/common.js';

const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Shader, Matrix, Mat4, Light, Shape, Material, Scene, Texture
} = tiny;

const {
    Phong_Shader, Subdivision_Sphere, Textured_Phong
} = defs;


export class Cat extends PhysicsObject {
    constructor(shape, color, material, center, project) {
        super(shape, 50, material);
        this.color = color;
        this.shapes = project.shapes;
        this.center = center;
        this.center[1] = 0;
        this.hit = false;
        this.materials = project.materials;

    }

    draw_cat(context, program_state, model_transform, scale) {
        //model_transform = model_transform.times(Mat4.scale(3,1,1));
        let black = hex_color("#000000");
        let tom_ear_color = hex_color("#763956");
        let belly = hex_color("#FFFFFF");
        model_transform = model_transform.times(Mat4.translation(0, Math.min(0, -(scale - 1) * 3), 0));
        let model_transform_original = model_transform;

        let model_transform_face = model_transform.times(Mat4.scale(scale, 1, 1));
        model_transform = model_transform.times(Mat4.scale(Math.min(1, 1 / scale), Math.min(1, 1 / scale), Math.min(1, 1 / scale)));
        //left eye
        let model_transform_left_eye = model_transform_face
            .times(Mat4.translation(-2.4, 0.7, 0.8))
            .times(Mat4.scale(0.5, 1, 0.5));
        this.shapes.sphere.draw(context, program_state, model_transform_left_eye, this.materials.plastic.override({color: belly}));
        model_transform_left_eye = model_transform_left_eye
            .times(Mat4.translation(-0.6, -0.15, 0.1))
            .times(Mat4.scale(0.7, 0.3, 0.7));
        this.shapes.sphere.draw(context, program_state, model_transform_left_eye, this.materials.plastic.override({color: black}));

        //right eye
        let model_transform_right_eye = model_transform_face
            .times(Mat4.translation(-2.4, 0.7, -0.8))
            .times(Mat4.scale(0.5, 1, 0.5));
        this.shapes.sphere.draw(context, program_state, model_transform_right_eye, this.materials.plastic.override({color: belly}));
        model_transform_right_eye = model_transform_right_eye
            .times(Mat4.translation(-0.65, -0.17, -0.1))
            .times(Mat4.scale(0.7, 0.3, 0.7));
        this.shapes.sphere.draw(context, program_state, model_transform_right_eye, this.materials.plastic.override({color: black}));

        //mouth + nose
        let model_transform_mouth = model_transform_face
            .times(Mat4.translation(-2.3, -0.4, 0))
        this.shapes.sphere.draw(context, program_state, model_transform_mouth, this.materials.plastic.override({color: belly}));
        model_transform_mouth = model_transform_face
            .times(Mat4.translation(-3, 0.1, 0))
            .times(Mat4.scale(0.4, 0.4, 0.4));
        this.shapes.sphere.draw(context, program_state, model_transform_mouth, this.materials.plastic.override({color: black}));

        //whiskers
        let model_transform_top_left_whisker = model_transform_face
            .times(Mat4.translation(-3.5, 0, 1.2))
            .times(Mat4.rotation(0.9 * Math.PI, 1, 0, 0))
            .times(Mat4.scale(0.03, 0.03, 1));
        this.shapes.cube.draw(context, program_state, model_transform_top_left_whisker, this.materials.plastic.override({color: black}));

        let model_transform_bot_left_whisker = model_transform_face
            .times(Mat4.translation(-3.5, -1, 1.2))
            .times(Mat4.rotation(1.1 * Math.PI, 1, 0, 0))
            .times(Mat4.scale(0.03, 0.03, 1));
        this.shapes.cube.draw(context, program_state, model_transform_bot_left_whisker, this.materials.plastic.override({color: black}));

        let model_transform_top_right_whisker = model_transform_face
            .times(Mat4.translation(-3.5, 0, -1.2))
            .times(Mat4.rotation(-0.9 * Math.PI, 1, 0, 0))
            .times(Mat4.scale(0.03, 0.03, 1));
        this.shapes.cube.draw(context, program_state, model_transform_top_right_whisker, this.materials.plastic.override({color: black}));

        let model_transform_bot_right_whisker = model_transform_face
            .times(Mat4.translation(-3.5, -1, -1.2))
            .times(Mat4.rotation(-1.1 * Math.PI, 1, 0, 0))
            .times(Mat4.scale(0.03, 0.03, 1));
        this.shapes.cube.draw(context, program_state, model_transform_bot_right_whisker, this.materials.plastic.override({color: black}));

        //head
        let model_transform_head = model_transform_face.times(Mat4.scale(3, 3, 3));
        this.shapes.sphere.draw(context, program_state, model_transform_head, this.material);

        model_transform = model_transform.times(Mat4.scale(3, 3, 3));
        //body
        model_transform = model_transform.times(Mat4.translation(0, -2, 0)).times(Mat4.scale(1, 1.4, 1));
        this.shapes.sphere.draw(context, program_state, model_transform, this.material);
        //belly
        model_transform = model_transform.times(Mat4.translation(-0.55, 0, 0)).times(Mat4.scale(0.55, 0.7, 0.55));
        this.shapes.sphere.draw(context, program_state, model_transform, this.materials.plastic.override({color: belly}));

        //arms
        let model_transform_left_arm = model_transform_original
            .times(Mat4.translation(0, -5, 2.8))
            .times(Mat4.rotation(-Math.PI / 8, 1, 0, 0))
            .times(Mat4.scale(0.7, 2.5, 0.7));
        this.shapes.sphere.draw(context, program_state, model_transform_left_arm, this.materials.arm.override({color: this.color}));

        let model_transform_right_arm = model_transform_original
            .times(Mat4.translation(0, -5, -3))
            .times(Mat4.rotation(Math.PI / 8, 1, 0, 0))
            .times(Mat4.scale(0.7, 2.5, 0.7));
        this.shapes.sphere.draw(context, program_state, model_transform_right_arm, this.materials.arm.override({color: this.color}));

        let model_transform_left_leg = model_transform_original
            .times(Mat4.translation(0, -10, 1))
            .times(Mat4.scale(0.7, 1.5, 0.7));
        this.shapes.sphere.draw(context, program_state, model_transform_left_leg, this.materials.arm.override({color: this.color}));

        let model_transform_right_leg = model_transform_original
            .times(Mat4.translation(0, -10, -1))
            .times(Mat4.scale(0.7, 1.5, 0.7));
        this.shapes.sphere.draw(context, program_state, model_transform_right_leg, this.materials.arm.override({color: this.color}));


        //outer ear
        let model_transform_ear = model_transform_original
            .times(Mat4.rotation(Math.PI / 2, 0, 1, 0))
            .times(Mat4.rotation(Math.PI / 6, 0, 0, 1))
            .times(Mat4.translation(0, 3.5, 0))
            .times(Mat4.rotation(-Math.PI / 2, 1, 0, 0))
            .times(Mat4.scale(1, 0.1, 1));
        this.shapes.cone.draw(context, program_state, model_transform_ear, this.materials.plastic.override({color: this.color}));
        model_transform_ear = model_transform_original
            .times(Mat4.rotation(Math.PI / 2, 0, 1, 0))
            .times(Mat4.rotation(-Math.PI / 6, 0, 0, 1))
            .times(Mat4.translation(0, 3.5, 0))
            .times(Mat4.rotation(-Math.PI / 2, 1, 0, 0))
            .times(Mat4.scale(1, 0.1, 1));
        this.shapes.cone.draw(context, program_state, model_transform_ear, this.materials.plastic.override({color: this.color}));

        //inner ear
        let model_transform_inner_ear = model_transform_original
            .times(Mat4.translation(-0.1, 0, 0))
            .times(Mat4.rotation(Math.PI / 2, 0, 1, 0))
            .times(Mat4.rotation(Math.PI / 6, 0, 0, 1))
            .times(Mat4.translation(0, 3.5, 0))
            .times(Mat4.rotation(-Math.PI / 2, 1, 0, 0))
            .times(Mat4.scale(0.5, 0.1, 0.5));
        this.shapes.cone.draw(context, program_state, model_transform_inner_ear, this.materials.plastic.override({color: tom_ear_color}));
        model_transform_inner_ear = model_transform_original
            .times(Mat4.translation(-0.1, 0, 0))
            .times(Mat4.rotation(Math.PI / 2, 0, 1, 0))
            .times(Mat4.rotation(-Math.PI / 6, 0, 0, 1))
            .times(Mat4.translation(0, 3.5, 0))
            .times(Mat4.rotation(-Math.PI / 2, 1, 0, 0))
            .times(Mat4.scale(0.5, 0.1, 0.5));
        this.shapes.cone.draw(context, program_state, model_transform_inner_ear, this.materials.plastic.override({color: tom_ear_color}));
    }

    collide(program_state) {
        this.hit = true;
        this.hit_time = program_state.animation_time;
    }

    getLocation() {
        return Mat4.translation(...this.center);
    }

    display(context, program_state) {
        if (this.hit) {
            let scaling_factor = Math.min((program_state.animation_time - this.hit_time) / 150, 3);
            this.draw_cat(context, program_state, Mat4.translation(...this.center.plus(vec3(0, 13, 0))).times(Mat4.scale(1.15, 1.15, 1.15)).times(Mat4.rotation(-Math.PI / 2, 0, 1, 0)), scaling_factor);
        } else
            this.draw_cat(context, program_state, Mat4.translation(...this.center.plus(vec3(0, 13, 0))).times(Mat4.scale(1.15, 1.15, 1.15)).times(Mat4.rotation(-Math.PI / 2, 0, 1, 0)), 1);

    }
}