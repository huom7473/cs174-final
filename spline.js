import {tiny, defs} from './examples/common.js';

// Pull these names into this module's scope for convenience:
const { vec3, vec4, color, Mat4, Shape, Material, Shader, Texture, Component } = tiny;

export
class Curve_Shape extends Shape {
    // curve_function: (t) => vec3
    constructor(curve_function, sample_count, curve_color=color( 1, 0, 0, 1 )) {
        super("position", "normal");

        this.material = { shader: new defs.Phong_Shader(), ambient: 1.0, color: curve_color }
        this.sample_count = sample_count;

        if (curve_function && this.sample_count) {
            for (let i = 0; i < this.sample_count + 1; i++) {
                let t = i / this.sample_count;
                this.arrays.position.push(curve_function(t));
                this.arrays.normal.push(vec3(0, 0, 0)); // have to add normal to make Phong shader work.
            }
        }
    }

    draw(webgl_manager, uniforms) {
        // call super with "LINE_STRIP" mode
        super.draw(webgl_manager, uniforms, Mat4.identity(), this.material, "LINE_STRIP");
    }

    update(webgl_manager, uniforms, curve_function) {
        if (curve_function && this.sample_count) {
            for (let i = 0; i < this.sample_count + 1; i++) {
                let t = 1.0 * i / this.sample_count;
                this.arrays.position[i] = curve_function(t);
            }
        }
        // this.arrays.position.forEach((v, i) => v = curve_function(i / this.sample_count));
        this.copy_onto_graphics_card(webgl_manager.context);
        // Note: vertex count is not changed.
        // not tested if possible to change the vertex count.
    }
};


const Spline =
    class Spline {
        constructor() {
            this.points = [];
            this.tangents = [];
            this.size = 0;
        }

        add_point(x,y,z,tx,ty,tz) {
            this.points.push(vec3(x,y,z));
            this.tangents.push(vec3(tx,ty,tz));
            this.size += 1;
        }

        set_point(idx, x, y, z) {
            if (idx >= this.points.length)
                return;
            this.points[idx] = vec3(x, y, z);
        }

        set_tangent(idx, tx, ty, tz) {
            if (idx >= this.tangents.length)
                return;
            this.tangents[idx] = vec3(tx, ty, tz);
        }

        get_position(t) {
            if(this.size < 2) {
                return vec3(0,0,0);
            }
            const A = Math.floor(t * (this.size-1));
            const B = Math.ceil(t * (this.size-1));
            const s = (t * (this.size-1)) % 1.0;

            let a = this.points[A].copy();
            let b = this.points[B].copy();
            return a.times(1-s).plus(b.times(s));
        }
    };

export
const Hermite_Spline =
    class Hermite_Spline extends Spline {

        get_position(t) {
            if(this.size < 2) {
                return vec3(0,0,0);
            }

            const A = Math.floor(t * (this.size-1));
            const B = Math.ceil(t * (this.size-1));
            const s = (t * (this.size-1)) % 1.0;

            let a = this.points[A].copy()
            let ta = this.tangents[A].copy()
            let b = this.points[B].copy()
            let tb = this.tangents[B].copy()

            return a.times(2*s**3 - 3*s**2 + 1).plus(ta.times(s**3 - 2*s**2 + s)).plus(b.times(-2*s**3 + 3*s**2)).plus(tb.times(s**3-s**2));
        }

        get_velocity(t) {
            if(this.size < 2) {
                return vec3(0,0,0);
            }

            const A = Math.floor(t * (this.size-1));
            const B = Math.ceil(t * (this.size-1));
            const s = (t * (this.size-1)) % 1.0;

            let a = this.points[A].copy()
            let ta = this.tangents[A].copy()
            let b = this.points[B].copy()
            let tb = this.tangents[B].copy()

            return a.times(6*s**2 - 6*s).plus(ta.times(3*s**2 - 4*s + 1)).plus(b.times(-6*s**2 + 6*s)).plus(tb.times(3*s**2-2*s));
        }
    };