// ============================================
// DATA — Barèmes, zones, tables de référence
// Les Artisans Verts © 2026
// ============================================

// URL du Google Apps Script pour l'upload de documents
// → À remplacer par l'URL de déploiement (voir google-apps-script-upload.js)
var UPLOAD_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwjopnaVjOlmPFWo5zjkq0Us__f119D3VKCICXl6gc_xZBP_CofZoEywgfKsiIKV3qPIQ/exec';

// Clé publique VAPID pour les notifications push
var VAPID_PUBLIC_KEY = 'BPCzvYHBwJ78-QKT67mfnRAyMwPqdiQO1gxlyQOFfb_L-W6jeWRS1WhPaO28DerABQvwx84xPbyq-MNLmyS0-vQ';

const DEPT_ZONE = {
    "01":"H1","02":"H1","03":"H1","04":"H2","05":"H1","06":"H3","07":"H2","08":"H1","09":"H2","10":"H1",
    "11":"H3","12":"H2","13":"H3","14":"H1","15":"H1","16":"H2","17":"H2","18":"H2","19":"H1","20":"H3",
    "2A":"H3","2B":"H3",
    "21":"H1","22":"H2","23":"H1","24":"H2","25":"H1","26":"H2","27":"H1","28":"H1","29":"H2","30":"H3",
    "31":"H2","32":"H2","33":"H2","34":"H3","35":"H2","36":"H2","37":"H2","38":"H1","39":"H1","40":"H2",
    "41":"H2","42":"H1","43":"H1","44":"H2","45":"H1","46":"H2","47":"H2","48":"H2","49":"H2","50":"H2",
    "51":"H1","52":"H1","53":"H2","54":"H1","55":"H1","56":"H2","57":"H1","58":"H1","59":"H1","60":"H1",
    "61":"H1","62":"H1","63":"H1","64":"H2","65":"H2","66":"H3","67":"H1","68":"H1","69":"H1","70":"H1",
    "71":"H1","72":"H2","73":"H1","74":"H1","75":"H1","76":"H1","77":"H1","78":"H1","79":"H2","80":"H1",
    "81":"H2","82":"H2","83":"H3","84":"H2","85":"H2","86":"H2","87":"H1","88":"H1","89":"H1","90":"H1",
    "91":"H1","92":"H1","93":"H1","94":"H1","95":"H1"
};

const REVENUS_2026 = {
    PROVINCE: {
        1: [17363, 22259, 31185],
        2: [25393, 32553, 45842],
        3: [30540, 39148, 55196],
        4: [35676, 45735, 64550],
        5: [40835, 52348, 73907],
        supplement: [5151, 6598, 9357]
    },
    IDF: {
        1: [24031, 29253, 40851],
        2: [35270, 42933, 60051],
        3: [42357, 51564, 71846],
        4: [49455, 60208, 84562],
        5: [56580, 68877, 96817],
        supplement: [7116, 8663, 12257]
    }
};

function getSeuilsForPersonnes(region, nb) {
    const data = REVENUS_2026[region];
    if (nb <= 5) return data[nb];
    const base = data[5];
    const sup = data.supplement;
    const extra = nb - 5;
    return [
        base[0] + sup[0] * extra,
        base[1] + sup[1] * extra,
        base[2] + sup[2] * extra
    ];
}
const CEE_PRICE = { tm: 12.5, autres: 7.5 }; // €/MWhc

const BAR143 = { H1: 134800, H2: 121000, H3: 100500 };

// BAR-TH-148 v.A73.3 — Forfaits officiels (à compter du 01/11/2025)
const BAR148 = { maison: 14700, appartement: 11800 };

const BAR171 = {
    maison: {
        base: { lt140: 90900, ge140: 109200 },
        coefSurface: (S) => (S < 70 ? 0.5 : (S < 90 ? 0.7 : 1.0)),
        tranches: "Maison : S<70→0,5 · 70≤S<90→0,7 · S≥90→1"
    },
    appartement: {
        base: { lt140: 48700, ge140: 58900 },
        coefSurface: (S) => (S < 35 ? 0.5 : (S < 60 ? 0.7 : 1.0)),
        tranches: "Appart : S<35→0,5 · 35≤S<60→0,7 · S≥60→1"
    },
    coefZone: { H1: 1.2, H2: 1.0, H3: 0.7 }
};


function surfaceToCategory(surfaceVal) {
    // surfaceVal comes from the dropdown: "S<70", "70<=S<90", "S>=90" (maison) or "S<35", "35<=S<60", "S>=60" (appart)
    // Map to table CEE keys
    const map = {
        'S<70': 'S<70', '70<=S<90': '70<S<90', 'S>=90': '90<S<110',
        'S<35': 'S<70', '35<=S<60': '70<S<90', 'S>=60': '90<S<110'
    };
    return map[surfaceVal] || '90<S<110';
}

function getSurfaceLabel() {
    const sel = document.getElementById('surface');
    return sel.options[sel.selectedIndex].text;
}

// Surface coef from dropdown value (BAR-TH-171 officiel)
function getSurfaceCoef(surfaceVal) {
    const map = { 'S<70': 0.5, '70<=S<90': 0.7, 'S>=90': 1, 'S<35': 0.5, '35<=S<60': 0.7, 'S>=60': 1 };
    return map[surfaceVal] || 1;
}

// Dynamic surface options based on type logement
function updateSurfaceOptions() {
    const tl = document.getElementById('typeLogement').value;
    const sel = document.getElementById('surface');
    const oldCoef = getSurfaceCoef(sel.value); // preserve coef level
    sel.innerHTML = '';
    if (tl === 'maison') {
        sel.add(new Option('S < 70 m²', 'S<70'));
        sel.add(new Option('70 ≤ S < 90 m²', '70<=S<90'));
        sel.add(new Option('S ≥ 90 m²', 'S>=90'));
    } else {
        sel.add(new Option('S < 35 m²', 'S<35'));
        sel.add(new Option('35 ≤ S < 60 m²', '35<=S<60'));
        sel.add(new Option('S ≥ 60 m²', 'S>=60'));
    }
    // Set option with same coef level
    const coefToMaison = { 0.5: 'S<70', 0.7: '70<=S<90', 1: 'S>=90' };
    const coefToAppart = { 0.5: 'S<35', 0.7: '35<=S<60', 1: 'S>=60' };
    const targetMap = tl === 'maison' ? coefToMaison : coefToAppart;
    sel.value = targetMap[oldCoef] || sel.options[sel.options.length - 1].value;
}
// ============================================
// DONNÉES PRINCIPALES
// ============================================
const D={TTC:{"PAC":10890,"PAC + BALLON ÉLECTRIQUE":13750,"PAC + BALLON THERMO":13750,"PAC + SSC":25850,"SSC":15000},MPR:{"PAC":{BLEU:5000,JAUNE:4000,VIOLET:3000,ROSE:0},"PAC + BALLON ÉLECTRIQUE":{BLEU:5000,JAUNE:4000,VIOLET:3000,ROSE:0},"PAC + BALLON THERMO":{BLEU:6200,JAUNE:4800,VIOLET:3400,ROSE:0},"PAC + SSC":{BLEU:15000,JAUNE:12000,VIOLET:7000,ROSE:0},"SSC":{BLEU:10000,JAUNE:8000,VIOLET:4000,ROSE:0}},COUT:{"PAC":6600,"PAC + BALLON ÉLECTRIQUE":6800,"PAC + BALLON THERMO":7200,"PAC + SSC":11650,"SSC":8500},COUT_DETAIL:{"PAC":{pac_materiel:2900,pac_pose:2500,ballon_materiel:0,ballon_pose:0,accessoires:800,admin:400,mairie:0},"PAC + BALLON ÉLECTRIQUE":{pac_materiel:2900,pac_pose:2500,ballon_materiel:200,ballon_pose:0,accessoires:800,admin:400,mairie:0},"PAC + BALLON THERMO":{pac_materiel:2900,pac_pose:2500,ballon_materiel:1100,ballon_pose:500,accessoires:800,admin:400,mairie:0},"PAC + SSC":{pac_materiel:2900,pac_pose:2500,ssc_materiel:2800,ssc_pose:2000,ballon_materiel:0,ballon_pose:0,accessoires:800,admin:400,mairie:250},"SSC":{pac_materiel:0,pac_pose:0,ssc_materiel:4200,ssc_pose:3500,ballon_materiel:0,ballon_pose:0,accessoires:500,admin:300,mairie:250}},CEE:{"140-170":{H1:{PAC:{"S<70":274800,"70<S<90":384720,"90<S<110":549600,"110<S<130":604560,"S>130":879360},"BALLON ELECTRIQUE":{"S<70":274800,"70<S<90":384720,"90<S<110":549600,"110<S<130":604560,"S>130":879360},"BALLON THERMO":{"S<70":289500,"70<S<90":399420,"90<S<110":564300,"110<S<130":619260,"S>130":894060},"BALLON SSC":{"S<70":769200,"70<S<90":769200,"90<S<110":769200,"110<S<130":769200,"S>130":769200}},H2:{PAC:{"S<70":229000,"70<S<90":320600,"90<S<110":458000,"110<S<130":503800,"S>130":732800},"BALLON ELECTRIQUE":{"S<70":229000,"70<S<90":320600,"90<S<110":458000,"110<S<130":503800,"S>130":732800},"BALLON THERMO":{"S<70":243700,"70<S<90":335300,"90<S<110":472700,"110<S<130":518500,"S>130":747500},"BALLON SSC":{"S<70":769200,"70<S<90":769200,"90<S<110":769200,"110<S<130":769200,"S>130":769200}},H3:{PAC:{"S<70":160300,"70<S<90":224420,"90<S<110":320600,"110<S<130":352660,"S>130":512960},"BALLON ELECTRIQUE":{"S<70":160300,"70<S<90":224420,"90<S<110":320600,"110<S<130":352660,"S>130":512960},"BALLON THERMO":{"S<70":175000,"70<S<90":239120,"90<S<110":335300,"110<S<130":367360,"S>130":527660},"BALLON SSC":{"S<70":769200,"70<S<90":769200,"90<S<110":769200,"110<S<130":769200,"S>130":769200}}},"111-140":{H1:{PAC:{"S<70":238500,"70<S<90":333900,"90<S<110":477000,"110<S<130":524700,"S>130":763200},"BALLON ELECTRIQUE":{"S<70":238500,"70<S<90":333900,"90<S<110":477000,"110<S<130":524700,"S>130":763200},"BALLON THERMO":{"S<70":253200,"70<S<90":348600,"90<S<110":491700,"110<S<130":539400,"S>130":777900},"BALLON SSC":{"S<70":769200,"70<S<90":769200,"90<S<110":769200,"110<S<130":769200,"S>130":769200}},H2:{PAC:{"S<70":198750,"70<S<90":278250,"90<S<110":397500,"110<S<130":437250,"S>130":636000},"BALLON ELECTRIQUE":{"S<70":198750,"70<S<90":278250,"90<S<110":397500,"110<S<130":437250,"S>130":636000},"BALLON THERMO":{"S<70":213450,"70<S<90":292950,"90<S<110":412200,"110<S<130":451950,"S>130":650700},"BALLON SSC":{"S<70":769200,"70<S<90":769200,"90<S<110":769200,"110<S<130":769200,"S>130":769200}},H3:{PAC:{"S<70":139125,"70<S<90":194775,"90<S<110":278250,"110<S<130":306075,"S>130":445200},"BALLON ELECTRIQUE":{"S<70":139125,"70<S<90":194775,"90<S<110":278250,"110<S<130":306075,"S>130":445200},"BALLON THERMO":{"S<70":153825,"70<S<90":209475,"90<S<110":292950,"110<S<130":320775,"S>130":459900},"BALLON SSC":{"S<70":769200,"70<S<90":769200,"90<S<110":769200,"110<S<130":769200,"S>130":769200}}}}};
const M={"PAC":"PAC","PAC + BALLON ÉLECTRIQUE":"BALLON ELECTRIQUE","PAC + BALLON THERMO":"BALLON THERMO","PAC + SSC":"BALLON SSC","SSC":"BALLON SSC"};

const SCENARIO_NAMES = {"PAC":"PAC","PAC + BALLON ÉLECTRIQUE":"PAC + Ballon Électrique","PAC + BALLON THERMO":"PAC + Ballon Thermo","PAC + SSC":"PAC + SSC","SSC":"SSC"};

const DEPT_TBASE = {
    '01':-10,'02':-9,'03':-8,'04':-8,'05':-10,'06':-5,'07':-6,'08':-10,'09':-8,'10':-10,
    '11':-5,'12':-8,'13':-5,'14':-7,'15':-10,'16':-5,'17':-5,'18':-8,'19':-8,'20':-2,
    '2A':-2,'2B':-2,'21':-10,'22':-4,'23':-8,'24':-5,'25':-12,'26':-6,'27':-7,'28':-7,
    '29':-4,'30':-5,'31':-5,'32':-5,'33':-5,'34':-5,'35':-5,'36':-7,'37':-7,'38':-10,
    '39':-10,'40':-5,'41':-7,'42':-8,'43':-10,'44':-5,'45':-7,'46':-5,'47':-5,'48':-10,
    '49':-5,'50':-5,'51':-10,'52':-10,'53':-5,'54':-12,'55':-10,'56':-4,'57':-12,'58':-10,
    '59':-9,'60':-7,'61':-7,'62':-9,'63':-8,'64':-5,'65':-5,'66':-5,'67':-12,'68':-12,
    '69':-8,'70':-12,'71':-10,'72':-7,'73':-12,'74':-12,'75':-7,'76':-7,'77':-7,'78':-7,
    '79':-5,'80':-9,'81':-5,'82':-5,'83':-3,'84':-6,'85':-5,'86':-5,'87':-8,'88':-12,
    '89':-10,'90':-12,'91':-7,'92':-7,'93':-7,'94':-7,'95':-7
};

var currentG = 0.95;

// ============================================
// CATALOGUE PAC — Fiches techniques complètes
// ============================================
const PAC_CATALOG = {
    THALEOS_04M:{m:'THALEOS',n:'PAC THALEOS R290 4kW Mono ETAS 195%',r:'THAHP04-M',a:'220-240V/1Ph',cop35:'5,15',cop55:'3,20',cap35:'4,5kW',cap55:'4,6kW',cls:'A+++/A+++',etas:'195/151',scop:'5,20/4,00',db:'56dB(A)',dim:'1130x420x704mm',kg:'93Kg',ref:'R290',ch:'-',pr:'18A',rg:'6'},
    THALEOS_06M:{m:'THALEOS',n:'PAC THALEOS R290 6kW Mono ETAS 194%',r:'THAHP06-M',a:'220-240V/1Ph',cop35:'4,95',cop55:'3,15',cap35:'6,35kW',cap55:'6,40kW',cls:'A+++/A+++',etas:'194/151',scop:'5,24/4,03',db:'56dB(A)',dim:'1130x420x704mm',kg:'93Kg',ref:'R290',ch:'-',pr:'18A',rg:'6'},
    THALEOS_08M:{m:'THALEOS',n:'PAC THALEOS R290 8kW Mono ETAS 198%',r:'THAHP08-M',a:'220-240V/1Ph',cop35:'5,00',cop55:'3,30',cap35:'8,40kW',cap55:'7,80kW',cls:'A+++/A+++',etas:'198/152',scop:'5,21/3,94',db:'57dB(A)',dim:'1280x420x1040mm',kg:'141Kg',ref:'R290',ch:'-',pr:'18A',rg:'6'},
    THALEOS_10M:{m:'THALEOS',n:'PAC THALEOS R290 10kW Mono ETAS 203%',r:'THAHP10-M',a:'220-240V/1Ph',cop35:'4,80',cop55:'3,25',cap35:'10,0kW',cap55:'9,50kW',cls:'A+++/A+++',etas:'203/154',scop:'5,16/3,93',db:'57dB(A)',dim:'1280x420x1040mm',kg:'141Kg',ref:'R290',ch:'-',pr:'18A',rg:'6'},
    THALEOS_12M:{m:'THALEOS',n:'PAC THALEOS R290 12kW Mono ETAS 186%',r:'THAHP12-M',a:'220-240V/1Ph',cop35:'4,90',cop55:'3,25',cap35:'12,0kW',cap55:'12,0kW',cls:'A+++/A+++',etas:'186/150',scop:'4,96/3,86',db:'57dB(A)',dim:'1280x420x1040mm',kg:'156Kg',ref:'R290',ch:'1,35kg',pr:'35A',rg:'6'},
    THALEOS_14M:{m:'THALEOS',n:'PAC THALEOS R290 14kW Mono ETAS 186%',r:'THAHP14-M',a:'220-240V/1Ph',cop35:'4,80',cop55:'3,20',cap35:'14,0kW',cap55:'14,0kW',cls:'A+++/A+++',etas:'186/150',scop:'5,13/3,93',db:'58dB(A)',dim:'1280x420x1040mm',kg:'156Kg',ref:'R290',ch:'1,35kg',pr:'35A',rg:'6'},
    THALEOS_16M:{m:'THALEOS',n:'PAC THALEOS R290 16kW Mono ETAS 188%',r:'THAHP16-M',a:'220-240V/1Ph',cop35:'4,70',cop55:'3,15',cap35:'15,1kW',cap55:'15,1kW',cls:'A+++/A+++',etas:'188/150',scop:'5,16/3,89',db:'60dB(A)',dim:'1280x420x1040mm',kg:'156Kg',ref:'R290',ch:'1,35kg',pr:'35A',rg:'6'},
    THALEOS_08T:{m:'THALEOS',n:'PAC THALEOS R290 8kW Tri ETAS 198%',r:'THAHP08-T',a:'380-415V/3Ph',cop35:'5,00',cop55:'3,30',cap35:'8,40kW',cap55:'7,80kW',cls:'A+++/A+++',etas:'198/152',scop:'5,16/3,89',db:'57dB(A)',dim:'1280x420x1040mm',kg:'141Kg',ref:'R290',ch:'1,35kg',pr:'10A',rg:'6'},
    THALEOS_10T:{m:'THALEOS',n:'PAC THALEOS R290 10kW Tri ETAS 203%',r:'THAHP10-T',a:'380-415V/3Ph',cop35:'4,80',cop55:'3,25',cap35:'10,0kW',cap55:'9,50kW',cls:'A+++/A+++',etas:'203/154',scop:'5,16/3,93',db:'57dB(A)',dim:'1280x420x1040mm',kg:'141Kg',ref:'R290',ch:'1,35kg',pr:'10A',rg:'6'},
    THALEOS_12T:{m:'THALEOS',n:'PAC THALEOS R290 12kW Tri ETAS 150%',r:'THAHP12-T',a:'380-415V/3Ph',cop35:'4,90',cop55:'3,25',cap35:'12,0kW',cap55:'12,0kW',cls:'A+++/A+++',etas:'186/150',scop:'4,98/3,86',db:'58dB(A)',dim:'1280x420x1040mm',kg:'141Kg',ref:'R290',ch:'1,35kg',pr:'10A',rg:'6'},
    THALEOS_14T:{m:'THALEOS',n:'PAC THALEOS R290 14kW Tri ETAS 150%',r:'THAHP14-T',a:'380-415V/3Ph',cop35:'4,80',cop55:'3,20',cap35:'14,0kW',cap55:'14,0kW',cls:'A+++/A+++',etas:'186/150',scop:'5,13/3,93',db:'59dB(A)',dim:'1280x420x1040mm',kg:'156Kg',ref:'R290',ch:'1,35kg',pr:'14A',rg:'6'},
    THALEOS_16T:{m:'THALEOS',n:'PAC THALEOS R290 16kW Tri ETAS 150%',r:'THAHP16-T',a:'380-415V/3Ph',cop35:'4,70',cop55:'3,15',cap35:'15,1kW',cap55:'15,1kW',cls:'A+++/A+++',etas:'188/150',scop:'5,05/3,88',db:'60dB(A)',dim:'1280x420x1040mm',kg:'156Kg',ref:'R290',ch:'1,35kg',pr:'14A',rg:'6'},
    THALEOS_BI_08M:{m:'THALEOS',n:'PAC THALEOS Bi-Bloc R290 8kW Mono ETAS 198%',r:'THAHPOUT8KW-M',a:'220-240V/1Ph',cop35:'5,00',cop55:'3,30',cap35:'8,10kW',cap55:'7,60kW',cls:'A+++/A+++',etas:'198/152',scop:'5,16/3,89',db:'57dB(A)',dim:'1280x420x1040mm',kg:'128Kg',ref:'R290',ch:'1,35kg',pr:'18A',rg:'6'},
    THALEOS_BI_10M:{m:'THALEOS',n:'PAC THALEOS Bi-Bloc R290 10kW Mono ETAS 203%',r:'THAHPOUT10KW-M',a:'220-240V/1Ph',cop35:'4,80',cop55:'3,25',cap35:'9,80kW',cap55:'9,40kW',cls:'A+++/A+++',etas:'203/154',scop:'5,16/3,93',db:'57dB(A)',dim:'1280x420x1040mm',kg:'128Kg',ref:'R290',ch:'1,35kg',pr:'18A',rg:'6'},
    THALEOS_BI_12M:{m:'THALEOS',n:'PAC THALEOS Bi-Bloc R290 12kW Mono ETAS 186%',r:'THAHPOUT12KW-M',a:'220-240V/1Ph',cop35:'4,90',cop55:'3,25',cap35:'11,6kW',cap55:'11,5kW',cls:'A+++/A+++',etas:'186/150',scop:'4,98/3,86',db:'58dB(A)',dim:'1280x420x1040mm',kg:'143Kg',ref:'R290',ch:'1,35kg',pr:'18A',rg:'6'},
    THALEOS_BI_14M:{m:'THALEOS',n:'PAC THALEOS Bi-Bloc R290 14kW Mono ETAS 186%',r:'THAHPOUT14KW-M',a:'220-240V/1Ph',cop35:'4,80',cop55:'3,20',cap35:'13,6kW',cap55:'13,5kW',cls:'A+++/A+++',etas:'186/150',scop:'5,13/3,93',db:'59dB(A)',dim:'1280x420x1040mm',kg:'143Kg',ref:'R290',ch:'1,35kg',pr:'35A',rg:'6'},
    THALEOS_BI_16M:{m:'THALEOS',n:'PAC THALEOS Bi-Bloc R290 16kW Mono ETAS 188%',r:'THAHPOUT16KW-M',a:'220-240V/1Ph',cop35:'4,70',cop55:'3,15',cap35:'14,9kW',cap55:'14,9kW',cls:'A+++/A+++',etas:'188/150',scop:'5,05/3,88',db:'60dB(A)',dim:'1280x420x1040mm',kg:'143Kg',ref:'R290',ch:'1,35kg',pr:'35A',rg:'6'},
    WELLEA_12T:{m:'WELLEA',n:'PAC WELLEA R290 12kW HT Tri',r:'BDHW-120R-04T35',a:'380V/3Ph',cop35:'4,90',cop55:'3,25',cap35:'12,1kW',cap55:'12,1kW',cls:'A+++',etas:'150',scop:'3,86',db:'-',dim:'-',kg:'-',ref:'R290',ch:'-',pr:'-',rg:'6'},
    WELLEA_14T:{m:'WELLEA',n:'PAC WELLEA R290 14kW HT Tri',r:'BDHW-140R-04T35',a:'380V/3Ph',cop35:'4,80',cop55:'3,20',cap35:'14,5kW',cap55:'14,5kW',cls:'A+++',etas:'150',scop:'3,93',db:'-',dim:'-',kg:'-',ref:'R290',ch:'-',pr:'-',rg:'6'},
    WELLEA_16T:{m:'WELLEA',n:'PAC WELLEA R290 16kW HT Tri',r:'BDHW-160R-04T35',a:'380V/3Ph',cop35:'4,70',cop55:'3,15',cap35:'15,9kW',cap55:'15,9kW',cls:'A+++',etas:'150',scop:'3,88',db:'-',dim:'-',kg:'-',ref:'R290',ch:'-',pr:'-',rg:'6'},
    WELLEA_16M:{m:'WELLEA',n:'PAC WELLEA R290 16kW HT Mono',r:'BDHW-160R-04M25',a:'220-240V/1Ph',cop35:'4,70',cop55:'3,15',cap35:'15,9kW',cap55:'15,9kW',cls:'A+++',etas:'150',scop:'3,88',db:'-',dim:'-',kg:'-',ref:'R290',ch:'-',pr:'-',rg:'6'},
    WOLF_FHA_05_06_230:{m:'WOLF',n:'PAC WOLF FHA 05/06 5kW Mono ETAS 181%',r:'9148083',a:'220-240V/1Ph',cop35:'4,7',cop55:'3,1',cap35:'5,0kW',cap55:'5,0kW',cls:'A+++',etas:'181/127',scop:'4,7/3,1',db:'56,8dB(A)',dim:'1295x718x429mm',kg:'79+27Kg',ref:'R32',ch:'1,4kg',pr:'-',rg:'BM-2'},
    WOLF_FHA_06_07_230:{m:'WOLF',n:'PAC WOLF FHA 06/07 6kW Mono ETAS 167%',r:'9148084',a:'220-240V/1Ph',cop35:'5,2',cop55:'2,8',cap35:'6,0kW',cap55:'6,0kW',cls:'A++',etas:'167/129',scop:'5,2/2,8',db:'59,8dB(A)',dim:'1295x718x429mm',kg:'79+27Kg',ref:'R32',ch:'1,4kg',pr:'-',rg:'BM-2'},
    WOLF_FHA_08_10_230:{m:'WOLF',n:'PAC WOLF FHA 08/10 8kW Mono ETAS 196%',r:'9148085',a:'220-240V/1Ph',cop35:'4,9',cop55:'2,9',cap35:'8,0kW',cap55:'8,0kW',cls:'A+++',etas:'196/133',scop:'4,9/2,9',db:'60,5dB(A)',dim:'1385x865x526mm',kg:'88+27Kg',ref:'R32',ch:'1,4kg',pr:'-',rg:'BM-2'},
    WOLF_FHA_11_14_230:{m:'WOLF',n:'PAC WOLF FHA 11/14 11kW Mono ETAS 174%',r:'9148086',a:'220-240V/1Ph',cop35:'5,1',cop55:'3,1',cap35:'11,0kW',cap55:'11,0kW',cls:'A++',etas:'174/126',scop:'5,1/3,1',db:'60,8dB(A)',dim:'1385x865x526mm',kg:'122+27Kg',ref:'R32',ch:'1,75kg',pr:'-',rg:'BM-2'},
    WOLF_FHA_14_17_230:{m:'WOLF',n:'PAC WOLF FHA 14/17 14kW Mono ETAS 178%',r:'9148087',a:'220-240V/1Ph',cop35:'5,0',cop55:'3,1',cap35:'13,0kW',cap55:'13,0kW',cls:'A+++',etas:'178/131',scop:'5,0/3,1',db:'66,4dB(A)',dim:'1385x865x526mm',kg:'122+27Kg',ref:'R32',ch:'1,75kg',pr:'-',rg:'BM-2'},
    WOLF_FHA_14_17_400:{m:'WOLF',n:'PAC WOLF FHA 14/17 14kW Tri ETAS 173%',r:'9148089',a:'380-415V/3Ph',cop35:'5,1',cop55:'3,1',cap35:'14,0kW',cap55:'13,0kW',cls:'A++',etas:'173/129',scop:'5,1/3,1',db:'66,6dB(A)',dim:'1385x865x526mm',kg:'122+27Kg',ref:'R32',ch:'1,75kg',pr:'-',rg:'BM-2'}
};
