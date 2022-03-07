import {defs, tiny} from './examples/common.js';
import {Body, Simulation} from './examples/collisions-demo.js'

const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Shader, Matrix, Mat4, Light, Shape, Material, Scene,
} = tiny;

const {
    Phong_Shader, Subdivision_Sphere
} = defs;


class Plane_Model extends Shape {
    constructor() {
        super("position", "normal", "texture_coord");
        defs.Closed_Cone.insert_transformed_copy_into(this, [30, 30], 
            Mat4.translation(0, 0, -0.5)
            .times(Mat4.scale(1, 1, 3))
            );
        defs.Cube.insert_transformed_copy_into(this, [],
            Mat4.scale(2.6, 0.2, 0.8)
            );
    }
}


class PhysicsObject {

    static ACC_GRAVITY = 0.2;

    constructor(shape, mass, material) {
        this.shape = shape;
        this.mass = mass;
        this.moment_inertia = 50;
        this.material = material;
        this.forces = {};
        this.torques = {};
        this.velocity = vec3(0, 0, 0);
        this.angular_velocity = vec3(0, 0, 0);

        this.center = vec3(0, 0, 0);
        this.rotation = Mat4.identity();
        this.previous = {center: this.center.copy(), rotation: this.rotation.copy()};

        
    }

    calc_acceleration() {
        
        let sumForces = vec3(0, 0, 0);
        let sumTorques = vec3(0, 0, 0);
        for (const force of Object.values(this.forces)) {
            sumForces = sumForces.plus(force.value);
            if ("loc" in force) {
                sumTorques = sumTorques.plus(this.rotation.times(force.loc.to4(true)).to3().cross(force.value));
            }
        }

        for (const torque of Object.values(this.torques)) {
            sumTorques = sumTorques.plus(torque.value);
        }

        
        const acceleration = sumForces.times(1 / this.mass);
        const angular_acceleration = sumTorques.times(1 / this.moment_inertia);

        return [acceleration, angular_acceleration];

    }

    advance(time_amount) {
        // for (let x of Object.values(this.forces)) {
        //     for (let y of x.value) {
        //         if (isNaN(y)) {
        //             console.log(this.forces);
        //             console.log(this.velocity);
        //         }
        //     }
        // }
        
        const [acceleration, angular_acceleration] = this.calc_acceleration();
        
        this.velocity = this.velocity.plus(acceleration.times(time_amount));
        this.angular_velocity = this.angular_velocity.plus(angular_acceleration.times(time_amount));
        
        this.previous = {center: this.center.copy(), rotation: this.rotation.copy()};
        
        this.center = this.center.plus(this.velocity.times(time_amount));
        const rotation_axis = this.angular_velocity.equals(vec3(0, 0, 0)) ? vec3(1, 0, 0) : this.angular_velocity.normalized();
        this.rotation.pre_multiply(Mat4.rotation(time_amount * this.angular_velocity.norm(), ...rotation_axis));
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

class Plane extends PhysicsObject {

    static THRUST = 150;

    static DRAG_CONSTANT = 1;
    static DRAG_CONSTANT_VER = 20;

    static LIFT_POWER = 0.1;



    constructor() {
        super(new Plane_Model(), 100, new Material(new Phong_Shader(), {
            ambient: 1, color: hex_color("#9d2b2b")
        }));

        this.thrust = false;
        this.pitch_forward = false;
        this.pitch_back = false;
        this.roll_left = false;
        this.roll_right = false;
        this.yaw_left = false;
        this.yaw_right = false;

        this.rotation = Mat4.identity();//Mat4.rotation(-Math.PI / 8, 1, 0, 0);

        this.forces.gravity = {
            value: vec3(0, -PhysicsObject.ACC_GRAVITY * this.mass, 0)
        };

    }

    update_thrust() {
        if (this.thrust) {
            this.forces.thrust = {
                value: this.rotation.times(vec4(0, 0, 1, 0)).to3().times(Plane.THRUST)
            }
        }
        else {
            this.forces.thrust = {
                value: vec3(0, 0, 0)
            }
        }
    }

    update_drag() {
        const hor_vel = vec3(this.velocity[0], 0, this.velocity[2]);
        const norm_vel = hor_vel.equals(vec3(0, 0, 0)) ? 
            vec3(0, 0, 0) : hor_vel.normalized();
        norm_vel[1] = 0;
        
        const drag_const_hor = Plane.DRAG_CONSTANT + (this.brake ? 0.5 : 0);
        this.forces.drag_hor = {
            value: norm_vel.times(
                (vec(this.velocity[0], this.velocity[2]).norm() ** 2) * -drag_const_hor
                ),
        };

        this.forces.drag_ver = {
            value: vec3(0, -Math.sign(this.velocity[1]) * (this.velocity[1] ** 2) * Plane.DRAG_CONSTANT_VER, 0),
            // value: vec3(0, 80, 0),
            // loc: vec3(0, 0, -0.1)
        }

    }

    update_lift() {
        // const head_point = this.rotation.times(vec4(0, 0, 1, 0)).to3();
        // let angle_atatck = Math.acos(
        //     head_point.dot(this.velocity) / (this.velocity.norm() * head_point.norm())
        //     );
        // if (isNaN(angle_atatck))
        //     angle_atatck = 0;
        
        // let angle_atatck_deg = (180 / Math.PI) * angle_atatck;

        // let lift_coefficient;

        // if (angle_atatck_deg > 90 || angle_atatck_deg < -90) {
        //     lift_coefficient = 0;
        // }
        // else if (angle_atatck_deg > -30 && angle_atatck_deg < 30) {
        //     lift_coefficient = angle_atatck_deg / 30;
        // }
        // else if (angle_atatck_deg > 30) {
        //     lift_coefficient = 1.5 - (angle_atatck_deg / 60);
        // }
        // else {
        //     lift_coefficient = -1.5 - (angle_atatck_deg / 60);
        // }

        const hor_speed = vec(this.velocity[0], this.velocity[2]).norm();
        this.forces.lift = {
            value: vec3(0, (hor_speed ** 2) * Plane.LIFT_POWER, 0),
            // value: vec3(0, (this.velocity.norm() ** 2) * lift_coefficient * Plane.LIFT_POWER, 0),
            loc: vec3(0, 0, 0.001),
        }

    }

    static ROLL_CORR = 3;
    static PITCH_CORR = 3;

    update_angular_correction() {
        const top_point = this.rotation.times(vec4(0, 1, 0, 0)).to3();
        const roll = Math.atan(top_point[0] / top_point[1]);
        const pitch = Math.atan(top_point[2] / top_point[1]);
        console.log(`${roll} ${pitch}`);

        if (roll < 0.05) 
        
        this.torques.roll_corr = {
            value: vec3(0, 0, -Plane.ROLL_CORR * roll)
        };

        this.torques.pitch_corr = {
            value: vec3(-Plane.PITCH_CORR * pitch, 0, 0)
        };

    }

    static DRAG_ANG_CONSTANT = 4;

    update_angular_drag() {

        const norm_vel = this.angular_velocity.equals(vec3(0, 0, 0)) ? 
            vec3(0, 0, 0) : this.angular_velocity.normalized();

        this.torques.ang_drag = {
            value: norm_vel.times(-Plane.DRAG_ANG_CONSTANT * (this.angular_velocity.norm()))
        }
    }

    static PITCH_STRENGTH = 1;
    static ROLL_STRENGTH = 1;
    static YAW_STRENGTH = 1;

    update_steering() {

        this.torques.pitch_forward = {
            value: this.pitch_forward ? this.rotation.times(vec4(Plane.PITCH_STRENGTH, 0, 0, 0)).to3() : vec3(0, 0, 0)
        };
        this.torques.pitch_back = {
            value: this.pitch_back ? this.rotation.times(vec4(-Plane.PITCH_STRENGTH, 0, 0, 0)).to3() : vec3(0, 0, 0)
        };
        this.torques.roll_left = {
            value: this.roll_left ? this.rotation.times(vec4(0, 0, -Plane.ROLL_STRENGTH, 0)).to3() : vec3(0, 0, 0)
        };
        this.torques.roll_right = {
            value: this.roll_right ? this.rotation.times(vec4(0, 0, Plane.ROLL_STRENGTH, 0)).to3() : vec3(0, 0, 0)
        };
        this.torques.yaw_left = {
            value: this.yaw_left ? this.rotation.times(vec4(0, Plane.YAW_STRENGTH, 0, 0)).to3() : vec3(0, 0, 0)
        };
        this.torques.yaw_right = {
            value: this.yaw_right ? this.rotation.times(vec4(0, -Plane.YAW_STRENGTH, 0, 0)).to3() : vec3(0, 0, 0)
        };
        
    }

    advance(time_amount) {
        this.update_thrust();
        this.update_drag();
        this.update_lift();
        // this.update_angular_correction();
        this.update_angular_drag();
        this.update_steering();
        
        super.advance(time_amount);
    }

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
            square: new defs.Square()
        };

        // *** Materials
        this.materials = {
            test: new Material(new Phong_Shader(), {
                ambient: 1,
                color: hex_color("#9d2b2b"),
            }),
            plastic: new Material(new defs.Phong_Shader(),
                {ambient: .4, diffusivity: .6, specularity: 0, color: hex_color("#ffffff")}),
            ground: new Material(new defs.Phong_Shader(), {
                ambient: 1,
                color: hex_color("#2e521d"),
            }),
        }

        this.initial_camera_location = Mat4.look_at(vec3(20, 0, 0), vec3(0, 0, 0), vec3(0, 1, 0));

        // this.ball = new PhysicsObject(this.shapes.cone, 50, this.materials.test);
        // this.ball.forces.gravity = {
        //     value: vec3(0, -1 * 0.1 * this.ball.mass, 0),
        //     loc: vec3(0, 0, .2)
        // };
        this.plane = new Plane();
        this.bodies.push(this.plane);
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

        this.live_string(box => {
            box.textContent = "Speed: " + this.plane.velocity.norm().toFixed(2)
        });
        this.new_line();

        this.live_string(box => {
            box.textContent = `Position: ${this.plane.center[0].toFixed(1)}, ${this.plane.center[1].toFixed(1)}, ${this.plane.center[2].toFixed(1)}`
        });
        this.new_line();

        this.key_triggered_button("Thrust", ["c"], () => this.plane.thrust = true, undefined, () => this.plane.thrust = false);
        this.key_triggered_button("Air brakes", ["v"], () => this.plane.brake = true, undefined, () => this.plane.brake = false);
        this.new_line();
        this.key_triggered_button("Pitch Forward", ["u"], () => this.plane.pitch_forward = true, undefined, () => this.plane.pitch_forward = false);
        this.key_triggered_button("Pitch Backward", ["j"], () => this.plane.pitch_back = true, undefined, () => this.plane.pitch_back = false);
        this.new_line();
        this.key_triggered_button("Roll Left", ["h"], () => this.plane.roll_left = true, undefined, () => this.plane.roll_left = false);
        this.key_triggered_button("Roll Right", ["k"], () => this.plane.roll_right = true, undefined, () => this.plane.roll_right = false);
        this.new_line();
        this.key_triggered_button("Yaw Left", ["y"], () => this.plane.yaw_left = true, undefined, () => this.plane.yaw_left = false);
        this.key_triggered_button("Yaw Right", ["i"], () => this.plane.yaw_right = true, undefined, () => this.plane.yaw_right = false);
        this.new_line();

        super.make_control_panel();
    }

    update_state(dt) {
        // if (this.plane.center[1] < -2.5) {
        //     this.plane.center[1] = -2.5;
        //     this.plane.velocity[1] = 0;
        // }
    }

    display(context, program_state) {

        context.context.clearColor.apply(context.context, hex_color("#4fa8b8")); // background

        // let desired = Mat4.look_at(this.plane.center.plus(vec3(0, 0, -5)) || vec3(0, 0, 0),
        //     this.plane.drawn_location || Mat4.identity(),
        //     vec3(0, 1, 0));
        
        if (!context.scratchpad.controls) {
            this.children.push(context.scratchpad.controls = new defs.Movement_Controls());
            // Define the global camera and projection matrices, which are stored in program_state.
            program_state.set_camera(this.initial_camera_location);
        }

        let desired = Mat4.inverse((this.plane.drawn_location || Mat4.identity())
            .times(Mat4.translation(0, 0, -16))
            .times(Mat4.rotation(Math.PI, 0, 1, 0))
            // .times(Mat4.rotation(-Math.PI / 8, 1, 0, 0))
            );
        desired = desired.map((x,i) => Vector.from(program_state.camera_inverse[i]).mix(x, 0.2));
        program_state.set_camera(desired);


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

        this.shapes.square.draw(context, program_state, 
            Mat4.rotation(Math.PI / 2, 1, 0, 0)
            .times(Mat4.translation(0, 0, 3))
            .times(Mat4.scale(5000, 5000, 0)),
                this.materials.ground);

        super.display(context, program_state);
    }
}


