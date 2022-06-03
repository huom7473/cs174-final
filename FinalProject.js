import {defs, tiny} from './examples/common.js';
import {Simulation} from './examples/collisions-demo.js'
import {Cloud, Ground} from "./models.js";
import {Cat} from "./Cat.js";
import {Watermelon} from "./Watermelon.js";
import {Plane} from "./Plane.js";
import {Target} from "./Target.js"
import {Curve_Shape, Hermite_Spline} from "./spline.js";

import {Sim} from "./Sim.js"

const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Shader, Matrix, Mat4, Light, Shape, Material, Scene, Texture
} = tiny;

const {
    Phong_Shader, Subdivision_Sphere, Textured_Phong
} = defs;


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
            axes: new defs.Axis_Arrows(),
            ball: new Subdivision_Sphere(4)
        };

        // *** Materials
        this.materials = {
            watermelon: new Material(new Textured_Phong(), {
                color: hex_color("#556B2F"),
                ambient: 0.5, diffusivity: 0.1, specularity: 0.5,
                texture: new Texture("assets/watermelon.png")
            }),
            arm: new Material(new Textured_Phong(), {
                color: hex_color("#556B2F"),
                ambient: 0.5, diffusivity: 0.1, specularity: 0.5,
                texture: new Texture("assets/arm_bw.png")
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

        this.mode = 1;
        this.reset_values();
        this.drop_watermelon = false;
        this.melons = [];
        this.simulation = new Sim();
        this.clouds = this.generate_clouds();
    }

    reset_values() {
        this.plane = new Plane();
        this.bodies = [];
        this.bodies.push(this.plane);
        let cat_color = [hex_color("#000000"), hex_color("#e8e0b6"), hex_color("#ffa500")][Math.floor(Math.random() * 3)];
        this.cat = new Cat(this.shapes.cube, cat_color, this.materials.plastic.override({color: cat_color}), vec3(-5, 0, 100), this);

        const {r, spline} = this.generate_target_trajectory(3);
        this.target_trajectory = new Curve_Shape((t) => spline.get_position(t), 1000);
        this.simulation = new Sim();
        this.plane.center = vec3(0, 80, 0);
        this.target = new Target(r, spline, this);
        this.melon_flag = true;
        this.score = 0;
        this.melons = [];
        this.t_sim = 0;
        this.time_step = .001;
        this.death_timer = 0;
        this.animate = true;
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

    draw_plane(context, program_state, model_transform, draw_melon, hide) {
        let plane_color = hex_color("#8b0000");
        model_transform = model_transform.times(Mat4.rotation(Math.PI/2, 0,1,0));
        let original = model_transform;
        if(!hide)
            this.draw_tom(context, program_state, model_transform.times(Mat4.translation(0,15,-5)));
        let upper = model_transform;
        let lower = model_transform;
        let watermelon = model_transform;
        model_transform = model_transform.times(Mat4.scale(2,2,1));

        if(!hide){
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
            upper = upper.times(Mat4.scale(7, 0.2, 6));
            this.shapes.cube.draw(context, program_state, upper, this.materials.plastic.override({color: plane_color}));
            let upper_right = original
                .times(Mat4.translation(5,9.5,-14.5))
                .times(Mat4.rotation(Math.PI/8, 1, 0, 0))
                .times(Mat4.scale(7, 0.2, 4));
            //.times(Mat4.rotation(Math.PI/8, 1, 0, 0));
            this.shapes.cube.draw(context, program_state, upper_right, this.materials.plastic.override({color: plane_color}));
            let upper_left = original
                .times(Mat4.translation(5,9.5,4.7))
                .times(Mat4.rotation(-Math.PI/8, 1, 0, 0))
                .times(Mat4.scale(7, 0.2, 4));
            this.shapes.cube.draw(context, program_state, upper_left, this.materials.plastic.override({color: plane_color}));
            lower = lower.times(Mat4.translation(5,1,-5));
            lower = lower.times(Mat4.scale(6, 0.2, 4.5));
            this.shapes.cube.draw(context, program_state, lower, this.materials.plastic.override({color: plane_color}));

        }

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
            box.textContent = `Current Difficulty: ${["Easy", "Normal", "Hard", "Insane"][this.mode]}`;
            box.style["white-space"] = "pre-wrap";
        });
        this.new_line();
        this.key_triggered_button("Show/Hide Plane", ["p"], () => this.hide_plane = !this.hide_plane, undefined, () => this.plane.yaw_right = false);
        // super.make_control_panel();
    }

    update_state(dt) {

        if (this.score >= 30) {
            Plane.THRUST = Plane.THRUST_FAST;
            Plane.LIFT_POWER = Plane.LIFT_POWER_FAST;
            Plane.DRAG_CONSTANT = Plane.DRAG_CONSTANT_FAST;
        }
        else {
            Plane.THRUST = Plane.THRUST_SLOW;
            Plane.LIFT_POWER = Plane.LIFT_POWER_SLOW;
            Plane.DRAG_CONSTANT = Plane.DRAG_CONSTANT_SLOW;
        }
        if (this.plane.center[1] < 7){
            this.animate = false;
            this.simulation.plane_collision(this.plane.center);
        }



    }

    generate_target_trajectory(num_pts) {
        const MIN_DIST_Z = 150;
        const MAX_DIST_Z = 300;
        const MIN_DIST_X = [0, 15, 40, 100][this.mode];
        const MAX_DIST_X = [15, 40, 100, 200][this.mode];
        const MIN_RAD = 5;
        const MAX_RAD = 15;

        const starting_direction = Math.random() < 0.5 ? 1 : -1;
        const X_offset = Math.random() * (MAX_DIST_X - MIN_DIST_X) + MIN_DIST_X;
        const Z_offset = Math.random() * (MAX_DIST_Z - MIN_DIST_Z) + MIN_DIST_Z;
        const r = Math.ceil(Math.random() * (MAX_RAD - MIN_RAD)) + MIN_RAD;

        let initial_position = vec3(this.plane.center[0] + starting_direction * X_offset,
            1,
            this.plane.center[2] + Z_offset
        )

        let ending_position = vec3(this.plane.center[0] - starting_direction * X_offset,
            1,
            this.plane.center[2] + Z_offset
        )

        const spline = new Hermite_Spline();
        const pts = [initial_position]
        const tangents = []
        //spline.add_point(...initial_position, 0, 0, 0);

        const x_step = -starting_direction * 2 * X_offset / (num_pts + 1);
        const MIN_Z_OFFSET = [0, 10, 20, 40][this.mode];
        const MAX_Z_OFFSET = [10, 20, 40, 80][this.mode];
        for (let i = 1; i <= num_pts; ++i) {
            const dir = Math.random() < 0.5 ? 1 : -1;
            const offset = Math.random() * (MAX_Z_OFFSET - MIN_Z_OFFSET) + MIN_Z_OFFSET;
            pts.push(vec3(initial_position[0] + i * x_step, 1, initial_position[2] + dir * offset));
            tangents.push(pts[pts.length - 1].minus(pts[pts.length - 2]))
            //spline.add_point(initial_position[0] + i * x_step, 1, initial_position[2] + dir * offset, 0, 0, 0);
        }
        //spline.add_point(...ending_position, 0, 0, 0);
        pts.push(ending_position)
        tangents.push(pts[pts.length - 1].minus(pts[pts.length - 2]));
        tangents.push(vec3(0, 0, 0));

        for (let i = 0; i < pts.length; ++i) {
            spline.add_point(...pts[i], ...tangents[i]);
        }

        return {r, spline};
    }

    display(context, program_state) {
        if(!this.animate){
            this.death_timer += 1;
            if(this.death_timer > 100){
                this.reset_values();
                this.death_timer = 0;
            }
        }

        program_state.animate = this.animate;

        if (this.drop_watermelon){
            this.drop_watermelon = false;
            let melon = new Watermelon(this.shapes.sphere, this.materials.watermelon, this.plane.center, this.plane.rotation, this.plane.velocity);
            this.bodies.push(melon);
            this.melons.push(melon);
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

        let transform_plane = this.plane.drawn_location
            .times(Mat4.translation(5, -5, 5));

        if(this.animate){
            this.draw_plane(context, program_state, transform_plane, this.melon_flag, this.hide_plane);
        }
        this.cat.display(context, program_state);

        for (let melon of this.melons) {
            if (melon.drawn_location != null){
                melon.inverse = Mat4.inverse(melon.drawn_location);
                if (melon.check_colliding_cat(this.cat)) {
                    this.cat.collide(program_state);
                    melon.collide();
                    this.score += 5;
                    continue;
                } else if (melon.check_colliding_target(this.target, 1.2)) {
                    this.target.collide(program_state);
                    this.simulation.watermelon_collision(melon.center)
                    melon.collide();
                    this.score += 16 - this.target.radius;
                } else if (melon.check_ground_collision()) {
                    this.simulation.watermelon_collision(melon.center)
                    melon.collide();
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
            let cat_color = [hex_color("#000000"), hex_color("#e8e0b6"), hex_color("#ffa500")][Math.floor(Math.random() * 3)];
            let cat_position = vec3(
                this.plane.center[0] + (Math.random() < 0.5 ? 1 : -1) * (Math.random() * (MAX_CAT_DIST_X - MIN_CAT_DIST_X) + MIN_CAT_DIST_X),
                0,
                this.plane.center[2] + (Math.random() * (MAX_CAT_DIST_Z - MIN_CAT_DIST_Z) + MIN_CAT_DIST_Z)
            )
            this.cat = new Cat(this.shapes.cube, cat_color, this.materials.plastic.override({color: cat_color}), cat_position, this);
        }

        if (this.target.center[2] < this.plane.center[2] - 80) {
            const {r, spline} = this.generate_target_trajectory(3);
            this.target_trajectory = new Curve_Shape((t) => spline.get_position(t), 1000);
            this.target = new Target(r, spline, this);
        }

        this.melons = this.melons.filter(melon => !melon.collided);
        this.bodies = this.bodies.filter(melon => !melon.collided);

        for (let cloud_transform of this.clouds) {
            this.shapes.cloud.draw(context, program_state, cloud_transform, this.materials.cloud);
        }

        this.target.draw(context, program_state);
        this.target_trajectory.draw(context, program_state);

        this.simulation.draw ( context, program_state, this.shapes, this.materials);
        let dt = 1/30;

        const t_next = this.t_sim + dt;
        while(this.t_sim < t_next) {
            this.simulation.update(this.time_step, "symplectic");
            this.t_sim += this.time_step;
        }


    }
}


