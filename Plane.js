import {PhysicsObject} from "./PhysicsObject.js";
import {Plane_Model} from "./models.js";
import {defs, tiny} from './examples/common.js';

const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Shader, Matrix, Mat4, Light, Shape, Material, Scene, Texture
} = tiny;

const {
    Phong_Shader, Subdivision_Sphere, Textured_Phong
} = defs;

export class Plane extends PhysicsObject {

    static THRUST_SLOW = 90;
    static THRUST_FAST = 120;
    static THRUST = Plane.THRUST_SLOW;

    static DRAG_CONSTANT_FAST = 1.2;
    static DRAG_CONSTANT_SLOW = 4;
    static DRAG_CONSTANT = Plane.DRAG_CONSTANT_SLOW;
    static DRAG_CONSTANT_VER = 8;

    static LIFT_POWER_SLOW = 3;
    static LIFT_POWER_FAST = 1;
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

        this.width = 5;

    }

    update_thrust() {
        if (this.thrust) {
            this.forces.thrust = {
                value: this.rotation.times(vec4(0, 0, 1, 0)).to3().times(Plane.THRUST)
            }
        } else {
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

    static intersect_cube(p, margin = 0) {
        return p.every(value => value >= -1 - margin && value <= 1 + margin)
    }
    check_colliding_cat(cat) {
        const T = this.inverse.times(cat.getLocation());

        let points = Vector3.cast(
            [-4, 0, -4], [-4, 0, 4], [-4, 16, -4], [-4, 16, 4], [4, 0, -4], [4, 0, 4], [4, 16, -4], [4, 16, 4]);
        let intersect_test = Plane.intersect_cube;
        return points.some(p =>
            intersect_test(T.times(p.to4(1)).to3(), this.width));
    }

}