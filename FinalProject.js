import {defs, tiny} from './examples/common.js';
import {Body, Simulation} from './examples/collisions-demo.js'

const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Shader, Matrix, Mat4, Light, Shape, Material, Scene, Texture
} = tiny;

const {
    Phong_Shader, Subdivision_Sphere, Textured_Phong
} = defs;


class Cloud extends Shape {
    constructor() {
        super("position", "normal", "texture_coord");
        defs.Subdivision_Sphere.insert_transformed_copy_into(this, [4],
            Mat4.translation(4.5, 0, 0)
            .times(Mat4.scale(4, 3, 4))
        );
        defs.Subdivision_Sphere.insert_transformed_copy_into(this, [4],
            Mat4.translation(3, -1, 0)
            .times(Mat4.scale(4, 3.2, 4))
        );
        defs.Subdivision_Sphere.insert_transformed_copy_into(this, [4],
            Mat4.translation(1, -1, 0)
            .times(Mat4.scale(3, 3.2, 5))
        );
        defs.Subdivision_Sphere.insert_transformed_copy_into(this, [4],
            Mat4.translation(0, 1.3, 0)
            .times(Mat4.scale(3, 3, 4))
        );
        defs.Subdivision_Sphere.insert_transformed_copy_into(this, [4],
            Mat4.translation(-2, -0.2, 0)
            .times(Mat4.scale(4, 4, 4))
        );
        defs.Subdivision_Sphere.insert_transformed_copy_into(this, [4],
            Mat4.translation(-4.5, 0, 0)
            .times(Mat4.scale(3, 3, 3))
        );
    }
}

class Ground extends Shape {
    constructor() {
        super("position", "normal", "texture_coord");

        defs.Square.insert_transformed_copy_into(this, [],
            Mat4.rotation(Math.PI / 2, 1, 0, 0)
            .times(Mat4.translation(0, 0, 0))
            .times(Mat4.scale(5000, 5000, 0))
        );
        this.arrays.texture_coord = [vec(0, 0), vec(500, 0), vec(0, 500), vec(500, 500)];
    }
}


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

    static ACC_GRAVITY = 0.8;

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
}

class Cat extends PhysicsObject {
    constructor(shape, material, center, project) {
        super(shape, 50, material);
        this.shapes = project.shapes;
        this.center = center;
        this.center[1] = 0;
        this.hit = false;
    }

    collide(context, program_state) {
        this.hit = true;
        this.hit_time = program_state.animation_time;
    }

    getLocation() {
        return Mat4.translation(...this.center);
    }
    display(context, program_state) {
        if (this.hit) {
            let scaling_factor = Math.min((program_state.animation_time - this.hit_time) / 100, 5);
            this.shapes.cube.draw(context, program_state, Mat4.translation(...this.center).times(Mat4.scale(4, 8, 4 + scaling_factor)).times(Mat4.translation(0, 1, 0)), this.material);
        }
        else
            this.shapes.cube.draw(context, program_state, Mat4.translation(...this.center).times(Mat4.scale(4, 8, 4)).times(Mat4.translation(0, 1, 0)), this.material);
    }
}

class Watermelon extends PhysicsObject {

    constructor(shape, material, center, rotation, velocity) {
        super(shape, 50, material);
        this.center = center;
        this.rotation = rotation;
        this.inverse = this.drawn_location;
        this.velocity = vec3(velocity[0],0,velocity[2]); // velocity.plus(vec3(0,0,1));
        this.width = 3;
        this.collided = false;
        this.forces.gravity = {
            value: vec3(0, -PhysicsObject.ACC_GRAVITY * this.mass, 0)
        };
    }

    static intersect_cube(p, margin = 0) {
        return p.every(value => value >= -1 - margin && value <= 1 + margin)
    }

    collide() {
        this.collided = true;
    }

    check_colliding(cat) {
        //console.log("checking");

        const T = this.inverse.times(cat.getLocation(), this.temp_matrix);

        let points = Vector3.cast(
            [-4, 0, -4], [-4, 0, 4], [-4, 16, -4], [-4, 16, 4], [4, 0, -4], [4, 0, 4], [4, 16, -4], [4, 16, 4],);
        let intersect_test = Watermelon.intersect_cube;
        return points.some(p =>
            intersect_test(T.times(p.to4(1)).to3(), this.width));
    }
}

class Plane extends PhysicsObject {

    static THRUST_SLOW = 90;
    static THRUST_FAST = 600;
    static THRUST = Plane.THRUST_SLOW;

    static DRAG_CONSTANT_FAST = 1.2;
    static DRAG_CONSTANT_SLOW = 4;
    static DRAG_CONSTANT = Plane.DRAG_CONSTANT_SLOW;
    static DRAG_CONSTANT_VER = 8;

    static LIFT_POWER_SLOW = 3;
    static LIFT_POWER_FAST = 0.3;
    static LIFT_POWER = Plane.LIFT_POWER_SLOW;



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
        
        const drag_const_hor = Plane.DRAG_CONSTANT + (this.brake ? 1.5 : 0);
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
        let top_point = this.rotation.times(vec4(0, 1, 0, 0)).to3();
        top_point[2] = 0;
        const hor_speed = vec(this.velocity[0], this.velocity[2]).norm();
        this.forces.lift = {
            value: top_point.times((hor_speed ** 2) * Plane.LIFT_POWER),
            // value: vec3(0, (this.velocity.norm() ** 2) * lift_coefficient * Plane.LIFT_POWER, 0),
            loc: vec3(0, 0, 0.0005),
        }

    }

    static ROLL_CORR = 0.1;
    static PITCH_CORR = 0.5;

    update_angular_correction() {
        const top_point = this.rotation.times(vec4(0, 1, 0, 0)).to3();
        const roll = Math.atan(top_point[0] / top_point[1]);
        const pitch = Math.atan(top_point[2] / top_point[1]);
        // console.log(`${roll} ${pitch}`);

        this.torques.roll_corr = {
            value: vec3(0, 0, Plane.ROLL_CORR * roll)
        };

        this.torques.pitch_corr = {
            value: vec3(-Plane.PITCH_CORR * pitch, 0, 0)
        };

    }

    static DRAG_ANG_CONSTANT = 15;

    update_angular_drag() {

        const norm_vel = this.angular_velocity.equals(vec3(0, 0, 0)) ? 
            vec3(0, 0, 0) : this.angular_velocity.normalized();

        this.torques.ang_drag = {
            value: norm_vel.times(-Plane.DRAG_ANG_CONSTANT * (this.angular_velocity.norm()))
        }
    }

    static PITCH_STRENGTH = 1.6;
    static ROLL_STRENGTH = 1.6;
    static YAW_STRENGTH = 1.2;

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
        this.update_angular_correction();
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
            square: new defs.Square(),
            cloud: new Cloud(),
            ground: new Ground(),
            axes: new defs.Axis_Arrows()
        };

        // *** Materials
        this.materials = {
            watermelon: new Material(new Textured_Phong(), {
                color: hex_color("#556B2F"),
                ambient: 0.5, diffusivity: 0.1, specularity: 0.5,
                texture: new Texture("assets/watermelon.png")
            }),
            test: new Material(new Phong_Shader(), {
                ambient: 1,
                color: hex_color("#9d2b2b"),
            }),
            plastic: new Material(new defs.Phong_Shader(),
                {ambient: 0.3, diffusivity: 0.9, specularity: 0.1, color: hex_color("#ffffff")}),
            collided: new Material(new defs.Phong_Shader(),
                {ambient: .4, diffusivity: .6, specularity: 0, color: hex_color("#ff0000")}),
            ground: new Material(new defs.Textured_Phong(), {
                ambient: 1,
                color: hex_color("#2e521d"),
                texture: new Texture("assets/grass2.png")
            }),
            cloud: new Material(new defs.Phong_Shader(), {
                ambient: 0.6,
                diffusivity: 0.6,
                color: color(1, 1, 1, 0.1),
            })
        }

        this.initial_camera_location = Mat4.look_at(vec3(20, 0, 0), vec3(0, 0, 0), vec3(0, 1, 0));

        // this.ball = new PhysicsObject(this.shapes.cone, 50, this.materials.test);
        // this.ball.forces.gravity = {
        //     value: vec3(0, -1 * 0.1 * this.ball.mass, 0),
        //     loc: vec3(0, 0, .2)
        // };
        this.plane = new Plane();
        let cat_color = [hex_color("#000000"), hex_color("#e8e0b6"), hex_color("#ffa500")][Math.floor(Math.random() * 3)];
        this.cat = new Cat(this.shapes.cube, this.materials.plastic.override({color: cat_color}), vec3(-5, 0, 100), this);
        this.plane.center = vec3(0, 40, 0);
        this.bodies.push(this.plane);
        this.melon_flag = true;
        this.drop_watermelon = false;
        this.score = 0;
        this.melons = [];
        this.mode = 1;

        this.clouds = this.generate_clouds();
    }

    draw_tom(context, program_state, model_transform) {
        let tom_color = hex_color("#4a5282");
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
            .times(Mat4.scale(2, 0.1, 2));
        this.shapes.cone.draw(context, program_state, model_transform_ear, this.materials.plastic.override({color:tom_color}));
        model_transform_ear = model_transform_original
            .times(Mat4.rotation(Math.PI / 2, 0, 1, 0))
            .times(Mat4.rotation(-Math.PI / 6, 0, 0, 1))
            .times(Mat4.translation(0, 3.5, 0))
            .times(Mat4.rotation(-Math.PI / 2, 1, 0, 0))
            .times(Mat4.scale(2  , 0.1, 2));
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

    draw_plane(context, program_state, model_transform, draw_melon) {
        let plane_color = hex_color("#8b0000");
        model_transform = model_transform.times(Mat4.rotation(Math.PI/2, 0,1,0));
        this.draw_tom(context, program_state, model_transform.times(Mat4.translation(0,15,-5)));
        let upper = model_transform;
        let lower = model_transform;
        let watermelon = model_transform;
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

        //Watermelon
        watermelon = watermelon.times(Mat4.translation(5,4,-5));
        watermelon = watermelon.times(Mat4.scale(6,3,3));

        if (draw_melon) {
            this.shapes.sphere.draw(context,program_state, watermelon, this.materials.watermelon);
        }
        return model_transform;
    }

    generate_clouds() {
        const MIN_HEIGHT = 20;
        const MAX_HEIGHT = 180;
        const MIN_POS = -5000;
        const MAX_POS = 5000;
        const MIN_SCALE_X = 7;
        const MAX_SCALE_X = 12;
        const MIN_SCALE_Y = 4;
        const MAX_SCALE_Y = 8;
        const MIN_SCALE_Z = 4;
        const MAX_SCALE_Z = 8;
        const NUM_CLOUDS = 800;

        let clouds = [];

        let model_transform;
        let height;
        let scale_x;
        let scale_y;
        let scale_z;
        let x;
        let z;
        let rotation;
        for (let i = 0; i < NUM_CLOUDS; i++) {
            x = Math.random() * (MAX_POS - MIN_POS) + MIN_POS;
            z = Math.random() * (MAX_POS - MIN_POS) + MIN_POS;
            height = Math.random() * (MAX_HEIGHT - MIN_HEIGHT) + MIN_HEIGHT;

            scale_x = Math.random() * (MAX_SCALE_X - MIN_SCALE_X) + MIN_SCALE_X;
            scale_y = Math.random() * (MAX_SCALE_Y - MIN_SCALE_Y) + MIN_SCALE_Y;
            scale_z = Math.random() * (MAX_SCALE_Z - MIN_SCALE_Z) + MIN_SCALE_Z;

            rotation = Math.random() * 2 * Math.PI;

            model_transform = Mat4.translation(x, height, z)
                .times(Mat4.rotation(rotation, 0, 1, 0))
                .times(Mat4.scale(scale_x, scale_y, scale_z));

            clouds.push(model_transform);
        }

        return clouds;
    }

    make_control_panel() {
        // Draw the scene's buttons, setup their actions and keyboard shortcuts, and monitor live measurements.

        this.live_string(box => {
            box.textContent = "Score: " + this.score
        });
        this.new_line();


        this.live_string(box => {
            const head_point = this.plane.rotation.times(vec4(0, 0, 1, 0)).to3();
            // let angle = (180 / Math.PI) * Math.atan2(head_point[2], head_point[0]) + 180;//Math.PI;
            let angle = Math.atan2(head_point[2], head_point[0]) + Math.PI;
            // angle = ((angle % 360) + 360) % 360;
            let dir = " ";
            dir += (angle > (9 * Math.PI / 8) && angle <= (11 * Math.PI / 8)) ? "\\" : " ";
            dir += (angle > (11 * Math.PI / 8) && angle <= (13 * Math.PI / 8)) ? "|" : " ";
            dir += (angle > (13 * Math.PI / 8) && angle <= (15 * Math.PI / 8)) ? "/" : " ";
            dir += " ";
            box.textContent = dir;
            box.style["white-space"] = "pre-wrap";
        });
        this.new_line();
        this.live_string(box => {
            const head_point = this.plane.rotation.times(vec4(0, 0, 1, 0)).to3();
            // let angle = (180 / Math.PI) * Math.atan2(head_point[2], head_point[0]) + 180;//Math.PI;
            let angle = Math.atan2(head_point[2], head_point[0]) + Math.PI;
            // angle = ((angle % 360) + 360) % 360;
            let dir = "";
            dir += (angle > (7 * Math.PI / 8) && angle <= (9 * Math.PI / 8)) ? "--" : "  ";
            dir += "●";
            dir += (angle > (15 * Math.PI / 8) || angle < (1 * Math.PI / 8)) ? "--" : "  ";
            box.textContent = dir;
            box.style["white-space"] = "pre-wrap";
        });

        //Altitude
        this.live_string(box => {
            let altitude = this.plane.center[1];
            let meter = Math.floor(altitude / 400 * 20);
            meter = Math.min(meter, 20);
            meter = Math.max(meter, 0);

            box.textContent = `${" ".repeat(5)} [${" ".repeat(meter)}0${" ".repeat(19 - meter)}]`;
            box.style["white-space"] = "pre-wrap";
        });

        this.new_line();
        this.live_string(box => {
            const head_point = this.plane.rotation.times(vec4(0, 0, 1, 0)).to3();
            // let angle = (180 / Math.PI) * Math.atan2(head_point[2], head_point[0]) + 180;//Math.PI;
            let angle = Math.atan2(head_point[2], head_point[0]) + Math.PI;
            // angle = ((angle % 360) + 360) % 360;
            let dir = " ";
            dir += (angle > (5 * Math.PI / 8) && angle <= (7 * Math.PI / 8)) ? "/" : " ";
            dir += (angle > (3 * Math.PI / 8) && angle <= (5 * Math.PI / 8)) ? "|" : " ";
            dir += (angle > (1 * Math.PI / 8) && angle <= (3 * Math.PI / 8)) ? "\\" : " ";
            dir += " ";
            box.textContent = dir;
            box.style["white-space"] = "pre-wrap";
        });
        this.new_line();


        this.live_string(box => {
            box.textContent = "Speed: " + this.plane.velocity.norm().toFixed(2) + " | ";
            box.style["white-space"] = "pre-wrap";
        });

        this.live_string(box => {
            box.textContent = `Position: ${this.plane.center[0].toFixed(1)}, ${this.plane.center[1].toFixed(1)}, ${this.plane.center[2].toFixed(1)}`
        });

        this.new_line();
        this.new_line();

        this.key_triggered_button("Thrust", [" "], () => this.plane.thrust = true, undefined, () => this.plane.thrust = false);
        this.key_triggered_button("Air brakes", ["v"], () => this.plane.brake = true, undefined, () => this.plane.brake = false);
        this.new_line();
        this.key_triggered_button("Pitch Forward", ["w"], () => this.plane.pitch_forward = true, undefined, () => this.plane.pitch_forward = false);
        this.key_triggered_button("Pitch Backward", ["s"], () => this.plane.pitch_back = true, undefined, () => this.plane.pitch_back = false);
        this.new_line();
        this.key_triggered_button("Roll Left", ["a"], () => this.plane.roll_left = true, undefined, () => this.plane.roll_left = false);
        this.key_triggered_button("Roll Right", ["d"], () => this.plane.roll_right = true, undefined, () => this.plane.roll_right = false);
        this.new_line();
        this.key_triggered_button("Yaw Left", ["q"], () => this.plane.yaw_left = true, undefined, () => this.plane.yaw_left = false);
        this.key_triggered_button("Yaw Right", ["e"], () => this.plane.yaw_right = true, undefined, () => this.plane.yaw_right = false);
        this.new_line();
        this.key_triggered_button("Watermelon", ["b"],
            () => {
                if (!this.melon_flag) return;
                this.drop_watermelon = true;
                this.melon_flag = false;
                setTimeout(() => this.melon_flag = true, 2000);
            },
            undefined);
        this.new_line(); this.new_line();
        this.key_triggered_button("Change Difficulty", ["m"], () => this.mode = this.mode + 1 >= 4 ? 0 : this.mode + 1, undefined);
        this.new_line();

        this.live_string(box => {
            box.textContent = `Current Difficulty: ${["Easy", "Medium", "Hard", "Insane"][this.mode]}`;
            box.style["white-space"] = "pre-wrap";
        });
        this.new_line();
        this.key_triggered_button("Show/Hide Plane", ["p"], () => this.hide_plane = !this.hide_plane, undefined, () => this.plane.yaw_right = false);
        // super.make_control_panel();
    }

    update_state(dt) {

        if (this.score > 5) {
            Plane.THRUST = Plane.THRUST_FAST;
            Plane.LIFT_POWER = Plane.LIFT_POWER_FAST;
            Plane.DRAG_CONSTANT = Plane.DRAG_CONSTANT_FAST;
        }
        else {
            Plane.THRUST = Plane.THRUST_SLOW;
            Plane.LIFT_POWER = Plane.LIFT_POWER_SLOW;
            Plane.DRAG_CONSTANT = Plane.DRAG_CONSTANT_SLOW;
        }

    }

    display(context, program_state) {
        if (this.drop_watermelon){
            this.drop_watermelon = false;
            let melon = new Watermelon(this.shapes.sphere, this.materials.watermelon, this.plane.center, this.plane.rotation, this.plane.velocity);
            this.bodies.push(melon);
            this.melons.push(melon);
            console.log("melon toggled");
        }

        context.context.clearColor.apply(context.context, hex_color("#4fa8b8")); // background

        if (!context.scratchpad.controls) {
            this.children.push(context.scratchpad.controls = new defs.Movement_Controls());
            // Define the global camera and projection matrices, which are stored in program_state.
            program_state.set_camera(this.initial_camera_location);
        }

        let desired = Mat4.inverse((this.plane.drawn_location || Mat4.identity())
            .times(Mat4.rotation(Math.PI / 6, 1, 0, 0))
            .times(Mat4.translation(0, 0, -60))
            //.times(Mat4.translation(60, 10, -15))
            .times(Mat4.rotation(Math.PI, 0, 1, 0))
            );
        desired = desired.map((x,i) => Vector.from(program_state.camera_inverse[i]).mix(x, 0.1));
        program_state.set_camera(desired);


        program_state.projection_transform = Mat4.perspective(
            Math.PI / 4, context.width / context.height, 1, 1000);
            // *** Lights: *** Values of vector or point lights.
        const light_position = vec4(0.5, 1, 0, 0).normalized();
        program_state.lights = [new Light(light_position, hex_color("ffe499"), 10000)];

        this.shapes.ground.draw(context, program_state, Mat4.identity(), this.materials.ground);

        //super.display(context, program_state);
        if (program_state.animate)
            this.simulate(program_state.animation_delta_time);

        //this.shapes.axes.draw(context, program_state, this.plane.drawn_location.times(Mat4.scale(6, 6, 6)), this.materials.test);
        let transform_plane = this.plane.drawn_location
            .times(Mat4.translation(5, -5, 5));
        if (!this.hide_plane)
            this.draw_plane(context, program_state, transform_plane, this.melon_flag);
        this.cat.display(context, program_state);

        for (let melon of this.melons) {
            if (melon.drawn_location != null){
                melon.inverse = Mat4.inverse(melon.drawn_location);
                if (melon.check_colliding(this.cat)) {
                    this.cat.collide(context, program_state);
                    melon.collide();
                    this.score += 1;
                    console.log(this.score);
                    continue;
                }
            }
            let model_transform_melon = melon.drawn_location.times(Mat4.rotation(Math.PI / 2, 0,1,0)).times(Mat4.scale(6,3,3));
            this.shapes.sphere.draw(context, program_state, model_transform_melon, this.materials.watermelon);
        }

        const MIN_CAT_DIST_Z = 120;
        const MAX_CAT_DIST_Z = 300;
        let MIN_CAT_DIST_X = [0, 15, 40, 100][this.mode];
        let MAX_CAT_DIST_X = [15, 40, 100, 200][this.mode];
        if (this.cat.center[2] < this.plane.center[2] - 40) {
            console.log("hi");
            let cat_color = [hex_color("#000000"), hex_color("#e8e0b6"), hex_color("#ffa500")][Math.floor(Math.random() * 3)];
            let cat_position = vec3(
                this.plane.center[0] + (Math.random() < 0.5 ? 1 : -1) * (Math.random() * (MAX_CAT_DIST_X - MIN_CAT_DIST_X) + MIN_CAT_DIST_X),
                0,
                this.plane.center[2] + (Math.random() * (MAX_CAT_DIST_Z - MIN_CAT_DIST_Z) + MIN_CAT_DIST_Z)
            )
            this.cat = new Cat(this.shapes.cube, this.materials.plastic.override({color: cat_color}), cat_position, this);
        }

        this.melons = this.melons.filter(melon => !melon.collided);

        for (let cloud_transform of this.clouds) {
            this.shapes.cloud.draw(context, program_state, cloud_transform, this.materials.cloud);
        }

    }
}


