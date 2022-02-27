import {defs, tiny} from './examples/common.js';
import {Body, Simulation} from './examples/collisions-demo.js'

const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Shader, Matrix, Mat4, Light, Shape, Material, Scene,
} = tiny;

const {
    Phong_Shader, Subdivision_Sphere
} = defs;

class PhysicsObject {

    static ACC_GRAVITY = 0.5;

    constructor(shape, mass, material) {
        this.shape = shape;
        this.mass = mass;
        this.moment_inertia = 50;
        this.material = material;
        this.forces = {};
        this.velocity = vec3(0, 0, 0);
        this.angular_velocity = vec3(0, 0, 0);

        this.center = vec3(0, 0, 0);
        this.rotation = Mat4.identity();
        this.previous = {center: this.center.copy(), rotation: this.rotation.copy()};
        // console.log(this.rotation);
        // this.advance(0);

        
    }

    calc_acceleration() {
        // const sumForces = Object.values(this.forces).reduce(
        //     (previous, current) => previous.plus(current.value), vec3(0, 0, 0)
        // );
        
        
        // const sumTorques = Object.values(this.forces).reduce(
        //     (previous, current) => previous.plus(current.hasOwnProperty("loc") ? current.value.cross(current.loc) : vec3(0, 0, 0)), vec3(0, 0, 0)
        // );
        
        let sumForces = vec3(0, 0, 0);
        let sumTorques = vec3(0, 0, 0);
        for (const force of Object.values(this.forces)) {
            sumForces = sumForces.plus(force.value);
            if ("loc" in force) {
                sumTorques = sumTorques.plus(force.value.cross(this.rotation.times(force.loc)));
            }
        }
        
        const acceleration = sumForces.times(1 / this.mass);
        const angular_acceleration = sumTorques.times(1 / this.moment_inertia);

        return [acceleration, angular_acceleration];

    }

    advance(time_amount) {
        
        const [acceleration, angular_acceleration] = this.calc_acceleration();
        
        this.velocity = this.velocity.plus(acceleration.times(time_amount));
        this.angular_velocity = this.angular_velocity.plus(angular_acceleration.times(time_amount));
        
        this.previous = {center: this.center.copy(), rotation: this.rotation.copy()};
        
        this.center = this.center.plus(this.velocity.times(time_amount));
        const rotation_axis = this.angular_velocity.equals(vec3(0, 0, 0)) ? vec3(1, 0, 0) : this.angular_velocity;
        this.rotation.pre_multiply(Mat4.rotation(-time_amount * this.angular_velocity.norm(), ...rotation_axis));
        // console.log(`${this.angular_velocity}`);
    }

    blend_rotation(alpha) {
        return this.rotation.map((x, i) => vec4(...this.previous.rotation[i]).mix(x, alpha));
    }

    blend_state(alpha) {
        this.drawn_location = Mat4.translation(...this.previous.center.mix(this.center, alpha))
            .times(this.blend_rotation(alpha));
            // .times(Mat4.scale(...this.size));
    }

    // draw(context, program_state) {
    //     if (this.lastDrawnTime === null) {
    //         this.lastDrawnTime = program_state.animation_time;
    //     }

    //     let dt = (program_state.animation_time - this.lastDrawnTime) / 1000;

    //     let sumForces = Object.values(this.forces).reduce(
    //         (previous, current) => previous.plus(current), vec3(0, 0, 0)
    //     );

    //     let acceleration = sumForces.copy();
    //     acceleration.scale_by(1 / this.mass);

    //     this.velocity = this.velocity.plus(acceleration.times(dt));

    //     let displacement = this.velocity.times(dt);
    //     this.model_transform.pre_multiply(Mat4.translation(...displacement));
    //     this.shape.draw(context, program_state, this.model_transform, this.material);

    //     this.lastDrawnTime = program_state.animation_time;
    // }

}

export class FinalProject extends Simulation {
    constructor() {
        // constructor(): Scenes begin by populating initial values like the Shapes and Materials they'll need.
        super();

        // At the beginning of our program, load one of each of these shape definitions onto the GPU.
        this.shapes = {
            sphere: new Subdivision_Sphere(4),
            cube: new defs.Cube(),
            cone: new defs.Closed_Cone(30, 30),
            wheel: new defs.Capped_Cylinder(15,15),
        };

        // *** Materials
        this.materials = {
            test: new Material(new Phong_Shader(), {
                ambient: 1, color: hex_color("#9d2b2b")
            }),
            plastic: new Material(new defs.Phong_Shader(),
                {ambient: .4, diffusivity: .6, specularity: 0, color: hex_color("#ffffff")}),
        }

        this.initial_camera_location = Mat4.look_at(vec3(20, 0, 0), vec3(0, 0, 0), vec3(0, 1, 0));

        this.ball = new PhysicsObject(this.shapes.cone, 50, this.materials.test);
        this.ball.forces.gravity = {
            value: vec3(0, -1 * 0.1 * this.ball.mass, 0),
            loc: vec3(0, 0, .2)
        };
        this.bodies.push(this.ball);
    }

    draw_tom(context, program_state, model_transform) {
        let tom_color = hex_color("#242b53");
        let tom_ear_color = hex_color("#763956");

        let model_transform_original = model_transform;
        model_transform = model_transform.times(Mat4.scale(3, 3, 3));
        this.shapes.sphere.draw(context, program_state, model_transform, this.materials.plastic.override({color: tom_color}));
        model_transform = model_transform.times(Mat4.translation(2, -1, 0)).times(Mat4.scale(2, 1.5, 1));
        this.shapes.sphere.draw(context, program_state, model_transform, this.materials.plastic.override({color: tom_color}));

        //outer ear
        let model_transform_ear = model_transform_original
            .times(Mat4.rotation(Math.PI / 2, 0, 1, 0))
            .times(Mat4.rotation(Math.PI / 6, 0, 0, 1))
            .times(Mat4.translation(0, 3.5, 0))
            .times(Mat4.rotation(-Math.PI / 2, 1, 0, 0))
            .times(Mat4.scale(1, 0.1, 1));
        this.shapes.cone.draw(context, program_state, model_transform_ear, this.materials.plastic.override({color:tom_color}));
        model_transform_ear = model_transform_original
            .times(Mat4.rotation(Math.PI / 2, 0, 1, 0))
            .times(Mat4.rotation(-Math.PI / 6, 0, 0, 1))
            .times(Mat4.translation(0, 3.5, 0))
            .times(Mat4.rotation(-Math.PI / 2, 1, 0, 0))
            .times(Mat4.scale(1, 0.1, 1));
        this.shapes.cone.draw(context, program_state, model_transform_ear, this.materials.plastic.override({color:tom_color}));

        //inner ear
        let model_transform_inner_ear = model_transform_original
            .times(Mat4.translation(-0.1, 0, 0))
            .times(Mat4.rotation(Math.PI / 2, 0, 1, 0))
            .times(Mat4.rotation(Math.PI / 6, 0, 0, 1))
            .times(Mat4.translation(0, 3.5, 0))
            .times(Mat4.rotation(-Math.PI / 2, 1, 0, 0))
            .times(Mat4.scale(0.5, 0.1, 0.5));
        this.shapes.cone.draw(context, program_state, model_transform_inner_ear, this.materials.plastic.override({color:tom_ear_color}));
        model_transform_inner_ear = model_transform_original
            .times(Mat4.translation(-0.1, 0, 0))
            .times(Mat4.rotation(Math.PI / 2, 0, 1, 0))
            .times(Mat4.rotation(-Math.PI / 6, 0, 0, 1))
            .times(Mat4.translation(0, 3.5, 0))
            .times(Mat4.rotation(-Math.PI / 2, 1, 0, 0))
            .times(Mat4.scale(0.5, 0.1, 0.5));
        this.shapes.cone.draw(context, program_state, model_transform_inner_ear, this.materials.plastic.override({color:tom_ear_color}));
    }

    draw_plane(context, program_state, model_transform) {
        let plane_color = hex_color("#8b0000");
        let upper = model_transform;
        let lower = model_transform;
        model_transform = model_transform.times(Mat4.scale(2,2,1));

        for(let i = 0; i < 4; i++){
            this.shapes.wheel.draw(context, program_state, model_transform, this.materials.plastic.override({color: plane_color}));
            model_transform = model_transform.times(Mat4.scale(0.25,2,0.5));
            model_transform = model_transform.times(Mat4.translation(0,1,0));
            this.shapes.cube.draw(context, program_state, model_transform, this.materials.plastic.override({color: plane_color}));
            model_transform = model_transform.times(Mat4.scale(4,0.5,2));
            if (i == 0){
                model_transform = model_transform.times(Mat4.translation(5,-2,0));
            } else if (i == 1){
                model_transform = model_transform.times(Mat4.translation(0,-2,-10));
            } else if (i == 2) {
                model_transform = model_transform.times(Mat4.translation(-5, -2, 0));
            }
        }

        //Upper and lower floors
        upper = upper.times(Mat4.translation(5,8,-5));
        upper = upper.times(Mat4.scale(7, 0.2, 14));
        this.shapes.cube.draw(context, program_state, upper, this.materials.plastic.override({color: plane_color}));
        lower = lower.times(Mat4.translation(5,1,-5));
        lower = lower.times(Mat4.scale(6, 0.2, 4.5));
        this.shapes.cube.draw(context, program_state, lower, this.materials.plastic.override({color: plane_color}));

        return model_transform;
    }

    make_control_panel() {
        // Draw the scene's buttons, setup their actions and keyboard shortcuts, and monitor live measurements.
        super.make_control_panel();
    }

    update_state() {

    }

    display(context, program_state) {
        
        if (!context.scratchpad.controls) {
            this.children.push(context.scratchpad.controls = new defs.Movement_Controls());
            // Define the global camera and projection matrices, which are stored in program_state.
            program_state.set_camera(this.initial_camera_location);
        }
        program_state.projection_transform = Mat4.perspective(
            Math.PI / 4, context.width / context.height, 1, 100);
            // *** Lights: *** Values of vector or point lights.
            const light_position = vec4(0, 5, 5, 1);
        program_state.lights = [new Light(light_position, color(1, 1, 1, 1), 1000)];

        // program_state.set_camera(Mat4.look_at(this.ball.center.plus(vec3(10, 0, 0)), this.ball.center, vec3(0, 1, 0)));

        // display():  Called once per frame of animation.
        // Setup -- This part sets up the scene's overall camera matrix, projection matrix, and lights:
        
        // let model_transform_plane = Mat4.identity();
        // let model_transform_tom = Mat4.translation(2, 15.5, -5);
        // const t = this.t = program_state.animation_time / 1000;
        // this.draw_tom(context, program_state, model_transform_tom);
        // this.draw_plane(context, program_state, model_transform_plane);



        // if (this.ball.model_transform[1][3] < 0) {
        //     // this.ball.addForce("up", vec3(0, 250, 0));
        //     this.ball.velocity = vec3(0, 10, 0);
        // }
        // this.ball.draw(context, program_state);
        super.display(context, program_state);
        // console.log(this.ball.drawn_location);
        // console.log(this.bodies);
    }
}


