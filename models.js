import {defs, tiny} from "./examples/common.js";

const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Shader, Matrix, Mat4, Light, Shape, Material, Scene, Texture
} = tiny;

const {
    Phong_Shader, Subdivision_Sphere, Textured_Phong
} = defs;


export class Cloud extends Shape {
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

export class Ground extends Shape {
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

export class Plane_Model extends Shape {
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