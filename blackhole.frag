#ifdef GL_ES
precision mediump float;
#endif

// Plane seettings
float scale=0.2;

// Ray marching settings
float MAX_DIST=1000.;
float MIN_DIST=.01;
float MIN_STEP=.5;
int MAX_STEPS=1000;
const float PI = 3.14159265359;

// Light settings
float ambient=.75;
float directed=.45;
vec3 LIGHT=vec3(0.,5.,3.);
float refSmoothness = 180.0/PI;


// Ray physics
float c=30.0;
float M=9.0;// Black hole mass
float G=6.7;// Gravity constant

// Shapes
vec3 BLACKHOLE=vec3(0.,1.,6.);
vec4 SPHERE=vec4(4.,1.,15.,10.);
vec2 DISK = vec2(6.6, 0.0005); // Radius multiplier and height

bool isBH=false;
bool isBG=false;

float sphere(vec4 sphere,vec3 p){
    return max(length(sphere.xyz-p)-sphere.w,0.0);
}

float ring(vec3 pos,float h,float r,vec3 p){
    vec2 d=abs(vec2(length(p.xz-pos.xz),p.y-pos.y))-vec2(r,h);
    return min(max(d.x,d.y),0.)+length(max(d,0.));
}

// float getGlow(float d) {
//     return 0.75*(1.0 - pow(d/glowR,2.0));
// }

float dist(vec3 p){

    isBH=false;
    
    float rs=2.*G*M/(c*c);//Schwardzchild radius
    
    float bh=sphere(vec4(BLACKHOLE.x,BLACKHOLE.y,BLACKHOLE.z, 1.5*rs),p);
    float circle=sphere(SPHERE,p);
    
    float ring=ring(vec3(BLACKHOLE.x,BLACKHOLE.y - DISK.y/2.0,BLACKHOLE.z),DISK.y,DISK.x*rs,p);
    float plane=p.y;
    
    float shapes[3]=float[3](bh,ring, circle);
    
    float result=shapes[0];
    
    for(int i=0;i<shapes.length();i++){
        result=min(result,shapes[i]);
    }

    if(result==bh && distance(p, BLACKHOLE) <= 3.0*rs){
        isBH=true;
    }

    return result;
}

vec3 normal(vec3 p){
    vec2 off=vec2(.01,0);
    float d=dist(p);
    
    vec3 n=d-vec3(// Measuring curvness of shape section
        dist(p-off.xyy),
        dist(p-off.yxy),
        dist(p-off.yyx)
    );
    
    return normalize(n);
}

vec3 shadow(vec3 p){
    if(isBH) return vec3(0.0);
    
    vec3 l=normalize(LIGHT-p);
    vec3 n=normal(p);
    float d=dist(p);
    
    //if (isBG) return abs(vec3(p.x / iResolution.x, p.y / iResolution.y, 0.0));
    return vec3((directed*dot(n,l)+ambient));
}

vec3 rayMarch(vec3 ro,vec3 rd){
    float D=0.;// Length of current step
    float d=0.0;
    vec3 p = ro;
    bool rayAttached=false;

    
    for(int i=0;i<MAX_STEPS;i++){
        p = p + rd * d;
        d=dist(p);
        D+=d;
        
        if(!rayAttached){
            float dist=distance(ro,BLACKHOLE);
            float alpha=acos(dot(normalize(BLACKHOLE - ro),rd));
            float rs=2.*G*M/(c*c);//Schwardzchild radius

            // if(D>=x/cos(alpha)){
            //     D=x/cos(alpha);
            //     float deformation=.1*rs/dist;
            //     vec2 offset=distance(ro+D*rd, )
            // }

            //float sd = sphere(vec4(BLACKHOLE.x,BLACKHOLE.y,BLACKHOLE.z, 1.5*rs),p);

            vec3 v1 = BLACKHOLE - (ro + rd * dist/cos(alpha));
            vec3 v2 = p - (ro + rd * dist/cos(alpha));

            if(dot(v1, v2) <= 0.0 ){
                    D=dist/cos(alpha);
                    p = ro + rd*D;
                    float R=dist*tan(alpha);
                    float phi=4.*G*M/(R*c)/refSmoothness; // Light refraction angle
                    vec3 rb = normalize(BLACKHOLE - p); // Ray to black hole 
                    float betta = acos(dot(rd, rb));
                    float k = sin(betta - phi)/sin(phi);

                    rd = normalize(1.0/(1.0 + k) * rb + 1.0/(1.0 + 1.0/k)*rd);
                    rayAttached=true;
            }
            
        }
        
        if(d>MAX_DIST){
            isBG=true;
            D = MAX_DIST;
            break;
        }
        if(d<MIN_DIST) {
            D = D - d + MIN_DIST;
            break;
        };
    }

    return p;
}

void mainImage(out vec4 fragColor,in vec2 fragCoord){
    // glow = 0.0; //Resetting glow
    
    vec2 uv=2.*scale*fragCoord/iResolution.xy-scale;//Start of coordinates
    //vec2 uv = (fragCoord - 0.5*iResolution.xy)/iResolution.y; //Start of coordinates
    
    // Animations
    //LIGHT = vec3(5.0*(sin(iTime)), 5.0*abs(sin(iTime)), 3.0*abs(sin(iTime)));
    SPHERE=vec4(4.*sin(iTime),4.*sin(iTime+.5),15.,1.);
    
    vec3 ro=vec3(10.*(iMouse.x/iResolution.x-.5),10.*(iMouse.y/iResolution.y-.5),0.);//Ray origin
    vec3 rd=normalize(vec3(uv.x,uv.y,1.));//Ray Direction. normalize() returns a vector with the same direction but with length 1
    
    vec3 p=rayMarch(ro,rd);
        
    vec3 color=shadow(p);
    
    fragColor=vec4(color,1.);
}