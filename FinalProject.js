import {defs, tiny} from './examples/common.js';

const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Shader, Matrix, Mat4, Light, Shape, Material, Scene,
} = tiny;

class Cube extends Shape {
    constructor() {
        super("position", "normal",);
        // Loop 3 times (for each axis), and inside loop twice (for opposing cube sides):
        this.arrays.position = Vector3.cast(
            [-1, -1, -1], [1, -1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, -1], [-1, 1, -1], [1, 1, 1], [-1, 1, 1],
            [-1, -1, -1], [-1, -1, 1], [-1, 1, -1], [-1, 1, 1], [1, -1, 1], [1, -1, -1], [1, 1, 1], [1, 1, -1],
            [-1, -1, 1], [1, -1, 1], [-1, 1, 1], [1, 1, 1], [1, -1, -1], [-1, -1, -1], [1, 1, -1], [-1, 1, -1]);
        this.arrays.normal = Vector3.cast(
            [0, -1, 0], [0, -1, 0], [0, -1, 0], [0, -1, 0], [0, 1, 0], [0, 1, 0], [0, 1, 0], [0, 1, 0],
            [-1, 0, 0], [-1, 0, 0], [-1, 0, 0], [-1, 0, 0], [1, 0, 0], [1, 0, 0], [1, 0, 0], [1, 0, 0],
            [0, 0, 1], [0, 0, 1], [0, 0, 1], [0, 0, 1], [0, 0, -1], [0, 0, -1], [0, 0, -1], [0, 0, -1]);
        // Arrange the vertices into a square shape in texture space too:
        this.indices.push(0, 1, 2, 1, 3, 2, 4, 5, 6, 5, 7, 6, 8, 9, 10, 9, 11, 10, 12, 13,
            14, 13, 15, 14, 16, 17, 18, 17, 19, 18, 20, 21, 22, 21, 23, 22);
    }
}

export class FinalProject extends Scene {
    constructor() {
        // constructor(): Scenes begin by populating initial values like the Shapes and Materials they'll need.
        super();

        // At the beginning of our program, load one of each of these shape definitions onto the GPU.
        this.shapes = {
            'cube': new Cube(),
            'sphere': new defs.Subdivision_Sphere(4),
        };

        // *** Materials
        this.materials = {
            plastic: new Material(new defs.Phong_Shader(),
                {ambient: .4, diffusivity: .6, color: hex_color("#ffffff")}),
        }

        this.initial_camera_location = Mat4.look_at(vec3(0, 10, 20), vec3(0, 0, 0), vec3(0, 1, 0));
    }

    draw_plane(context, program_state, model_transform, color) {
        let copy = model_transform;
        model_transform = model_transform.times(Mat4.scale(2,2,2));
        this.shapes.sphere.draw(context, program_state, model_transform, this.materials.plastic.override({color:color}));
        model_transform = model_transform.times(Mat4.scale(0.25,2,0.25));
        model_transform = model_transform.times(Mat4.translation(0,1,0));
        this.shapes.cube.draw(context, program_state, model_transform, this.materials.plastic.override({color:color}));

        model_transform = model_transform.times(Mat4.scale(4,0.5,4));
        model_transform = model_transform.times(Mat4.translation(5,-2,0));
        this.shapes.sphere.draw(context, program_state, model_transform, this.materials.plastic.override({color:color}));
        model_transform = model_transform.times(Mat4.scale(0.25,2,0.25));
        model_transform = model_transform.times(Mat4.translation(0,1,0));
        this.shapes.cube.draw(context, program_state, model_transform, this.materials.plastic.override({color:color}));

        model_transform = model_transform.times(Mat4.scale(4,0.5,4));
        model_transform = model_transform.times(Mat4.translation(0,-2,-5));
        this.shapes.sphere.draw(context, program_state, model_transform, this.materials.plastic.override({color:color}));
        model_transform = model_transform.times(Mat4.scale(0.25,2,0.25));
        model_transform = model_transform.times(Mat4.translation(0,1,0));
        this.shapes.cube.draw(context, program_state, model_transform, this.materials.plastic.override({color:color}));

        model_transform = model_transform.times(Mat4.scale(4,0.5,4));
        model_transform = model_transform.times(Mat4.translation(-5,-2,0));
        this.shapes.sphere.draw(context, program_state, model_transform, this.materials.plastic.override({color:color}));
        model_transform = model_transform.times(Mat4.scale(0.25,2,0.25));
        model_transform = model_transform.times(Mat4.translation(0,1,0));
        this.shapes.cube.draw(context, program_state, model_transform, this.materials.plastic.override({color:color}));

        model_transform = model_transform.times(Mat4.translation(6,1.25,6));
        model_transform = model_transform.times(Mat4.scale(7,0.1,20));

        copy = copy.times(Mat4.translation(5,8,-5));
        copy = copy.times(Mat4.scale(7, 0.2, 14));
        this.shapes.cube.draw(context, program_state, copy, this.materials.plastic.override({color:color}));

        return model_transform;
    }

    make_control_panel() {
        // Draw the scene's buttons, setup their actions and keyboard shortcuts, and monitor live measurements.

    }

    display(context, program_state) {

        if (!context.scratchpad.controls) {
            this.children.push(context.scratchpad.controls = new defs.Movement_Controls());
            // Define the global camera and projection matrices, which are stored in program_state.
            program_state.set_camera(Mat4.translation(5, -10, -30));
        }
        program_state.projection_transform = Mat4.perspective(
            Math.PI / 4, context.width / context.height, 1, 100);
        // *** Lights: *** Values of vector or point lights.
        const light_position = vec4(0, 5, 5, 1);
        program_state.lights = [new Light(light_position, color(1, 1, 1, 1), 1000)];

        // display():  Called once per frame of animation.
        // Setup -- This part sets up the scene's overall camera matrix, projection matrix, and lights:
        super.display(context, program_state);
        const blue = hex_color("#1a9ffa");
        let model_transform = Mat4.identity();
        const t = this.t = program_state.animation_time / 1000;
        this.draw_plane(context, program_state, model_transform, blue);

    }
}


