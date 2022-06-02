import {PhysicsObject} from "./PhysicsObject.js";
import {defs, tiny} from './examples/common.js';

const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Shader, Matrix, Mat4, Light, Shape, Material, Scene, Texture
} = tiny;

const {
    Phong_Shader, Subdivision_Sphere, Textured_Phong
} = defs;

export class Watermelon extends PhysicsObject {

    constructor(shape, material, center, rotation, velocity) {
        super(shape, 50, material);
        this.center = center;
        this.rotation = rotation;
        this.inverse = this.drawn_location;
        this.velocity = vec3(velocity[0], 0, velocity[2]); // velocity.plus(vec3(0,0,1));
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