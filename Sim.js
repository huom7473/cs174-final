import {defs, tiny} from './examples/common.js';

const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Shader, Matrix, Mat4, Light, Shape, Material, Scene, Texture
} = tiny;

const {
    Phong_Shader, Subdivision_Sphere, Textured_Phong
} = defs;


// TODO: you should implement the required classes here or in another file.
// TODO: you should implement the required classes here or in another file.
class Particle {
    constructor() {
        this.mass = 0;
        this.pos = vec3(0,0,0);
        this.vel = vec3(0,0,0);
        this.acc = vec3(0,0,0);
        this.ext_force = vec3(0,0,0);
        this.valid = false
        this.counter = 0;
        this.color = hex_color("#000000");
    }

    update(dt, method){
        //if (!this.valid)
        //  throw "Initialization not complete"
        //TODO: update
        if (method === "euler"){
            this.acc = this.ext_force.copy();
            this.acc.scale_by(dt/this.mass);
            this.pos = this.pos.plus(vec3(this.vel[0]*dt, this.vel[1]*dt, this.vel[2]*dt));
            this.vel = this.vel.plus(this.acc);
        } else if (method === "symplectic"){
            this.acc = this.ext_force.copy();
            this.acc.scale_by(dt/this.mass);
            this.vel = this.vel.plus(this.acc);
            this.pos = this.pos.plus(vec3(this.vel[0]*dt, this.vel[1]*dt, this.vel[2]*dt));
        }
    }
}

class Spring {
    constructor() {
        this.p_1 = null;
        this.p_2 = null;
        this.ks = 0;
        this.kd = 0;
        this.rest_length = 0;
        this.valid = false
    }
    update() {
        //if (!this.valid)
        //  throw "Initialization not complete"

        //TODO: Calc forces
        const diff = this.p_2.pos.minus(this.p_1.pos);
        const unit_diff = diff.normalized();
        let spring_force = unit_diff.copy();
        const spring_force_magnitude = this.ks * (diff.norm() - this.rest_length);
        spring_force.scale_by(spring_force_magnitude);

        const velocity_diff = this.p_2.vel.minus(this.p_1.vel);
        const damper_force = unit_diff.copy();
        const damper_force_magnitude = 1*this.kd * (velocity_diff.dot(diff.normalized()));
        damper_force.scale_by(damper_force_magnitude);

        const visc_force = spring_force.plus(damper_force);
        this.p_1.ext_force.add_by(visc_force);
        this.p_2.ext_force.subtract_by(visc_force);
    }
}

export class Sim {
    constructor() {
        this.particles = [];
        this.springs = [];
        this.g_acc = vec3(0,-9.8,0);
        this.ground_ks = 5000;
        this.ground_kd = 1;
    }

    addParticle(mass, x, y, z, vx, vy, vz, color){
        let p = new Particle();

        p.mass = mass;
        p.pos = vec3(x,y,z);
        p.vel = vec3(vx,vy,vz);
        p.color = color;

        this.particles.push(p)
    }
    update(dt, method) {
        for (const p of this.particles){
            p.ext_force = this.g_acc.times(p.mass);

            const diff = vec3(0, -p.pos[1], 0);
            let spring_force = diff.normalized();
            if (spring_force.dot(vec3(0,1,0)) > 0){
                const spring_force_magnitude = this.ground_ks * diff.norm();
                spring_force.scale_by(spring_force_magnitude);

                let damper_force = p.vel.normalized();
                const damper_force_magnitude = this.ground_kd * p.vel.norm();
                damper_force.scale_by( -1 *damper_force_magnitude);
                const visco_ground_force = spring_force.plus(damper_force);
                p.ext_force = p.ext_force.plus(visco_ground_force);
            }
        }

        for (const p of this.particles) {
            p.update(dt, method);
        }

    }

    watermelon_collision(center){
        for (let i = 0; i < 5; i++){
            for (let j = 0; j < 10; j++){
                let temp = Math.random();
                if (temp < 0.7){
                    this.addParticle(1.0, center[0]+(i)-2.5, center[1]+1, center[2]+(j)-5, (Math.random()-0.5)*30, (Math.random()-0.5)*15, (Math.random()-0.5)*30, hex_color("#dd4b4b"));
                } else{
                    this.addParticle(1.0, center[0]+(i)-2.5, center[1]+1, center[2]+(j)-5, (Math.random()-0.5)*30, (Math.random()-0.5)*15, (Math.random()-0.5)*30, hex_color("#aad75d"));
                }
            }
        }
        if(this.particles.length > 150){
            this.particles = this.particles.slice(50, 200);
        }

    }
    plane_collision(center){

        for (let i = 0; i < 15; i++){
            for (let j = 0; j < 8; j++){
                this.addParticle(1.0, center[0]+(i*2)-15, center[1]+4, center[2]+(j*2)-8, (Math.random()-0.5)*30, (Math.random()-0.5)*15, (Math.random()-0.5)*30, hex_color("#dd4b4b"));

            }
        }
        for (let i = 0; i < 3; i++){
            for (let j = 0; j < 6; j++){
                for (let k = 0; k < 3; k++) {
                    this.addParticle(1.0, center[0] + (i*2) - 2.5, center[1] + 10 + j - 3, center[2] + (k*2) - 2.5, (Math.random() - 0.5) * 30, (Math.random() - 0.5) * 15, (Math.random() - 0.5) * 30, hex_color("#4a5282"));
                }
            }
        }

    }

    cat_collision(center, cat_color){
        for (let i = 0; i < 3; i++){
            for (let j = 0; j < 6; j++){
                for (let k = 0; k < 3; k++) {
                    this.addParticle(1.0, center[0] + (i*2) - 2.5, center[1] + 10 + j - 3, center[2] + (k*2) - 2.5, (Math.random() - 0.5) * 30, (Math.random() - 0.5) * 15, (Math.random() - 0.5) * 30, cat_color);
                }
            }
        }
        if(this.particles.length > 150){
            this.particles = this.particles.slice(50, 200);
        }

    }

    draw(webgl_manager, uniforms, shapes, materials){
        const blue = color(0,0,1,1), red = color(1,0,0,1);

        for (const p of this.particles) {
            p.counter += 1;
            this.particles = this.particles.filter(p => p.counter < 250);
            const pos = p.pos;
            let model_transform = Mat4.scale(0.4,0.4,0.4);
            model_transform.pre_multiply(Mat4.translation(pos[0], pos[1], pos[2]));
            shapes.ball.draw(webgl_manager, uniforms, model_transform, { ...materials.plastic, color:p.color});
        }

    }
}