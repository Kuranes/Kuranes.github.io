var dataTime = [
{
    title: 'Live Cubemap',
    content: 'cubemap to RTT',
    link: 'shadow/examples/cubemap',
    img: 'html/cubemap.jpg',
    date: '2017'    
},
{
    title: 'Depth Codec',
    content: 'Depth Precision codecs test (float2rgba rgba2float)',
    link: 'postproc/examples/temporalpostfx/?filter0=DepthPrecision&filter1=DepthPrecision',
    img: 'html/depth.jpg',
    date: '2016'    
},
{
    title: 'Augmented Reality',
    content: 'using marker AR and webcam',
    link: 'ar/',
    img: 'html/ar.jpg',
    date: '2016'    
},
{
    title: 'Speech Recognition',
    content: 'Move using voice',
    link: 'speech/',
    img: 'html/img/cd-icon-picture.svg',
    date: '2016'    
},
{
    title: 'Normal To Heightmap (2015)',
    content: 'Approximate heightmap from normal map',
    link: 'normals/',
    img: 'html/normal.jpg',
    date: '2015'    
},
{
    title: 'SSR Screen Space Reflection in Webgl',
    content: 'The Infamous algo (Morgan McGuire)',
    link: 'postproc/examples/temporalpostfx/?filter0=Reflect&filter1=Reflect',
    img: 'html/ssr.jpg',
    date: '2016'    
},
{
    title: 'Refract',
    content: 'basic refraction (no IOR, not spectral)',
    link: 'postproc/examples/temporalpostfx/?filter0=Refract&filter1=Refract',
    img: 'html/refract.jpg',
    date: '2015'    
},
{
    title: 'Post Processing playground',
    content: 'You woudn\'t believe the Things I\'ve seen',
    link: 'postproc/examples/temporalpostfx/',
    img: 'html/postproc.jpg',
    date: '2015'    
},
{
    title: 'shadowblur',
    content: 'shadow "screenspace" blur checking speed/quality (not depth aware, not occluder search)',
    link: 'shadowblur/examples/shadowmap/',
    img: 'html/shaowblur.jpg',
    date: '2014'    
},
{
    title: 'Shadowmap',
    content: 'shadow algos pcf - vsm - esm - evsm',
    link: 'shadow/examples/shadowmap/?debug=1&debugBounds=1',
    img: 'html/shadowmap.jpg',
    date: '2014'    
},
{
    title: 'PBR',
    content: 'testing each PBR lights details',
    link: 'http://kuranes.github.io/physically_base_render_test/',
    img: 'html/pbr.jpg',
    date: '2013'    

},
{
    title: 'github link and sources',
    content: 'opened my github',
    link: 'https://github.com/Kuranes',
    img: 'html/octocat.png',
    date: '2013'    

},
{
    title: 'History Before',
    content: 'freelance stuff and ogre3D, no webgl live demos',
    link: 'https://sites.google.com/site/tuankuranes/',
    img: 'html/img/cd-icon-picture.svg',
    date: '2012'    

}]

var str = '';
str += '<div class="cd-timeline-block">';

str += '<div class="cd-timeline-img cd-picture">';

str += '<a class="lightbox" href="#%id%">';
str += '<img src="%img%" alt="Picture">';
str += '</a> ';

str += '<div class="lightbox-target" id="%id%">';
str += '<img src="%img%" alt="Picture"> ';
str += '<a class="lightbox-close" href="#"></a></div>';

str += '</div>' ;

str += '<div class="cd-timeline-content">';
str += '<h2>%title%</h2>';
str += '<p>%content%</p>';
str += '<a href="%link%" class="cd-read-more">Webgl Demo Sample</a>';
str += '<span class="cd-date">%date%</span>';
str += '</div> ';
str += '</div>';

function template(template,data){
    return template.replace(/%(\w*)%/g,function(m,key){return data.hasOwnProperty(key)?data[key]:"";});
}
var htmlToAdd ='';

for (var i=0,l= dataTime.length;i < l; i++){
    dataTime[i].id = 'goofy' + i;
    htmlToAdd += template(str, dataTime[i])
}

var timelineParent = document.getElementById('cd-timeline');
timelineParent.innerHTML = htmlToAdd;