import { c as convert } from './index8-DrQ5zxy0.js';
import { Writable } from 'node:stream';
import 'events';
import 'url';
import 'util';
import 'fs';
import 'http';
import 'https';
import 'zlib';
import 'stream';
import 'net';
import 'dns';
import 'os';
import 'path';
import 'crypto';
import 'tls';
import 'child_process';
import './_commonjsHelpers-C1uiShF5.js';
import 'node:crypto';
import './shared-server-BmU87nph.js';
import './date-utils-xyIWAIQq.js';
import './logger-C1WBmfZZ.js';
import './button-1bYQaKO-.js';
import './index5-DltsKoco.js';
import './context-CAhUmS6w.js';
import './utils2-CVx6kO_W.js';
import './badge-DEuvdmY7.js';
import './sheet-content-CfdNXqIw.js';
import './create-id-BLMzD-FL.js';
import './index3-BFl01i1Z.js';
import './states.svelte-CxCkWsnb.js';
import './events-C5y5VZ_W.js';
import './exports-Ci9YzwMm.js';
import './client-BGGljB7r.js';
import './html-FW6Ia4bL.js';

var Jr$1=Object.defineProperty;var Zr$1=e=>{throw TypeError(e)};var ks=(e,t,r)=>t in e?Jr$1(e,t,{enumerable:true,configurable:true,writable:true,value:r}):e[t]=r;var en$1=(e,t)=>{for(var r in t)Jr$1(e,r,{get:t[r],enumerable:true});};var ir$1=(e,t,r)=>ks(e,typeof t!="symbol"?t+"":t,r),xs=(e,t,r)=>t.has(e)||Zr$1("Cannot "+r);var $e=(e,t,r)=>(xs(e,t,"read from private field"),r?r.call(e):t.get(e)),tn$1=(e,t,r)=>t.has(e)?Zr$1("Cannot add the same private member more than once"):t instanceof WeakSet?t.add(e):t.set(e,r);var ws={};en$1(ws,{languages:()=>ms,options:()=>ds,parsers:()=>Qr$1,printers:()=>Ll});var xe$1=(e,t)=>(r,n,...i)=>r|1&&n==null?void 0:(t.call(n)??n[e]).apply(n,i);var As=String.prototype.replaceAll??function(e,t){return e.global?this.replace(e,t):this.split(e).join(t)},ys=xe$1("replaceAll",function(){if(typeof this=="string")return As}),w$1=ys;function Ns(e){return this[e<0?this.length+e:e]}var Ls=xe$1("at",function(){if(Array.isArray(this)||typeof this=="string")return Ns}),F=Ls;var Ps=()=>{},ze$1=Ps;var Ye$1="string",je$1="array",St="cursor",Ae$1="indent",ye$1="align",Et$1="trim",Ne$1="group",Le$1="fill",Pe$1="if-break",Oe$1="indent-if-break",Ct$1="line-suffix",vt="line-suffix-boundary",Y$1="line",Tt="label",De$1="break-parent",bt=new Set([St,Ae$1,ye$1,Et$1,Ne$1,Le$1,Pe$1,Oe$1,Ct$1,vt,Y$1,Tt,De$1]);function Os(e){if(typeof e=="string")return Ye$1;if(Array.isArray(e))return je$1;if(!e)return;let{type:t}=e;if(bt.has(t))return t}var wt=Os;var Ds=e=>new Intl.ListFormat("en-US",{type:"disjunction"}).format(e);function Is(e){let t=e===null?"null":typeof e;if(t!=="string"&&t!=="object")return `Unexpected doc '${t}', 
Expected it to be 'string' or 'object'.`;if(wt(e))throw new Error("doc is valid.");let r=Object.prototype.toString.call(e);if(r!=="[object Object]")return `Unexpected doc '${r}'.`;let n=Ds([...bt].map(i=>`'${i}'`));return `Unexpected doc.type '${e.type}'.
Expected it to be ${n}.`}var sr$1=class sr extends Error{name="InvalidDocError";constructor(t){super(Is(t)),this.doc=t;}},rn$1=sr$1;function ar$1(e,t){if(typeof e=="string")return t(e);let r=new Map;return n(e);function n(s){if(r.has(s))return r.get(s);let a=i(s);return r.set(s,a),a}function i(s){switch(wt(s)){case je$1:return t(s.map(n));case Le$1:return t({...s,parts:s.parts.map(n)});case Pe$1:return t({...s,breakContents:n(s.breakContents),flatContents:n(s.flatContents)});case Ne$1:{let{expandedStates:a,contents:o}=s;return a?(a=a.map(n),o=a[0]):o=n(o),t({...s,contents:o,expandedStates:a})}case ye$1:case Ae$1:case Oe$1:case Tt:case Ct$1:return t({...s,contents:n(s.contents)});case Ye$1:case St:case Et$1:case vt:case Y$1:case De$1:return t(s);default:throw new rn$1(s)}}}function L$1(e,t=nn$1){return ar$1(e,r=>typeof r=="string"?q$1(t,r.split(`
`)):r)}var kt$1=ze$1;function A(e){return {type:Ae$1,contents:e}}function Rs(e,t){return {type:ye$1,contents:t,n:e}}function on$1(e){return Rs(Number.NEGATIVE_INFINITY,e)}var j$1={type:De$1};function xt(e){return {type:Le$1,parts:e}}function C(e,t={}){return kt$1(t.expandedStates),{type:Ne$1,id:t.id,contents:e,break:!!t.shouldBreak,expandedStates:t.expandedStates}}function X$1(e,t="",r={}){return {type:Pe$1,breakContents:e,flatContents:t,groupId:r.groupId}}function ln(e,t){return {type:Oe$1,contents:e,groupId:t.groupId,negate:t.negate}}function q$1(e,t){let r=[];for(let n=0;n<t.length;n++)n!==0&&r.push(e),r.push(t[n]);return r}var _$1={type:Y$1},k$1={type:Y$1,soft:true},Ms={type:Y$1,hard:true},v$1=[Ms,j$1],Bs={type:Y$1,hard:true,literal:true},nn$1=[Bs,j$1];var cn=Object.freeze({character:"'",codePoint:39}),un$1=Object.freeze({character:'"',codePoint:34}),Fs=Object.freeze({preferred:cn,alternate:un$1}),qs=Object.freeze({preferred:un$1,alternate:cn});function Hs(e,t){let{preferred:r,alternate:n}=t===true||t==="'"?Fs:qs,{length:i}=e,s=0,a=0;for(let o=0;o<i;o++){let c=e.charCodeAt(o);c===r.codePoint?s++:c===n.codePoint&&a++;}return (s>a?n:r).character}var pn=Hs;function or$1(e){if(typeof e!="string")throw new TypeError("Expected a string");return e.replace(/[|\\{}()[\]^$+*?.]/g,"\\$&").replace(/-/g,"\\x2d")}var lr$1=class lr{#e;constructor(t){this.#e=new Set(t);}getLeadingWhitespaceCount(t){let r=this.#e,n=0;for(let i=0;i<t.length&&r.has(t.charAt(i));i++)n++;return n}getTrailingWhitespaceCount(t){let r=this.#e,n=0;for(let i=t.length-1;i>=0&&r.has(t.charAt(i));i--)n++;return n}getLeadingWhitespace(t){let r=this.getLeadingWhitespaceCount(t);return t.slice(0,r)}getTrailingWhitespace(t){let r=this.getTrailingWhitespaceCount(t);return t.slice(t.length-r)}hasLeadingWhitespace(t){return this.#e.has(t.charAt(0))}hasTrailingWhitespace(t){return this.#e.has(F(0,t,-1))}trimStart(t){let r=this.getLeadingWhitespaceCount(t);return t.slice(r)}trimEnd(t){let r=this.getTrailingWhitespaceCount(t);return t.slice(0,t.length-r)}trim(t){return this.trimEnd(this.trimStart(t))}split(t,r=false){let n=`[${or$1([...this.#e].join(""))}]+`,i=new RegExp(r?`(${n})`:n,"u");return t.split(i)}hasWhitespaceCharacter(t){let r=this.#e;return Array.prototype.some.call(t,n=>r.has(n))}hasNonWhitespaceCharacter(t){let r=this.#e;return Array.prototype.some.call(t,n=>!r.has(n))}isWhitespaceOnly(t){let r=this.#e;return Array.prototype.every.call(t,n=>r.has(n))}#t(t){let r=Number.POSITIVE_INFINITY;for(let n of t.split(`
`)){if(n.length===0)continue;let i=this.getLeadingWhitespaceCount(n);if(i===0)return 0;n.length!==i&&i<r&&(r=i);}return r===Number.POSITIVE_INFINITY?0:r}dedentString(t){let r=this.#t(t);return r===0?t:t.split(`
`).map(n=>n.slice(r)).join(`
`)}},hn$1=lr$1;var Vs=["	",`
`,"\f","\r"," "],Us=new hn$1(Vs),y=Us;var cr$1=class cr extends Error{name="UnexpectedNodeError";constructor(t,r,n="type"){super(`Unexpected ${r} node ${n}: ${JSON.stringify(t[n])}.`),this.node=t;}},mn$1=cr$1;var Ws=new Set(["sourceSpan","startSourceSpan","endSourceSpan","nameSpan","valueSpan","keySpan","tagDefinition","tokens","valueTokens","switchValueSourceSpan","expSourceSpan","valueSourceSpan"]),Gs=new Set(["if","else if","for","switch","case"]);function fn(e,t,r){if(e.kind==="text"||e.kind==="comment")return null;if(e.kind==="yaml"&&delete t.value,e.kind==="attribute"){let{fullName:n,value:i}=e;n==="style"||n==="class"||n==="srcset"&&(r.fullName==="img"||r.fullName==="source")||n==="allow"&&r.fullName==="iframe"||n.startsWith("on")||n.startsWith("@")||n.startsWith(":")||n.startsWith(".")||n.startsWith("#")||n.startsWith("v-")||n==="vars"&&r.fullName==="style"||(n==="setup"||n==="generic")&&r.fullName==="script"||n==="slot-scope"||n.startsWith("(")||n.startsWith("[")||n.startsWith("*")||n.startsWith("bind")||n.startsWith("i18n")||n.startsWith("on-")||n.startsWith("ng-")||i?.includes("{{")?delete t.value:i&&(t.value=w$1(0,i,/'|&quot;|&apos;/gu,'"'));}if(e.kind==="docType"&&(t.value=w$1(0,e.value.toLowerCase(),/\s+/gu," ")),e.kind==="angularControlFlowBlock"&&e.parameters?.children)for(let n of t.parameters.children)Gs.has(e.name)?delete n.expression:n.expression=n.expression.trim();e.kind==="angularIcuExpression"&&(t.switchValue=e.switchValue.trim()),e.kind==="angularLetDeclarationInitializer"&&delete t.value,e.kind==="element"&&e.isVoid&&!e.isSelfClosing&&(t.isSelfClosing=true);}fn.ignoredProperties=Ws;var dn$1=fn;function K$1(e,t=true){return [A([k$1,e]),t?k$1:""]}function W$1(e,t){let r=e.type==="NGRoot"?e.node.type==="NGMicrosyntax"&&e.node.body.length===1&&e.node.body[0].type==="NGMicrosyntaxExpression"?e.node.body[0].expression:e.node:e.type==="JsExpressionRoot"?e.node:e;return r&&(r.type==="ObjectExpression"||r.type==="ArrayExpression"||(t.parser==="__vue_expression"||t.parser==="__vue_ts_expression"||t.parser==="__ng_binding"||t.parser==="__ng_directive")&&(r.type==="TemplateLiteral"||r.type==="StringLiteral"))}async function x$1(e,t,r,n){r={__isInHtmlAttribute:true,__embeddedInHtml:true,...r};let i=true;n&&(r.__onHtmlBindingRoot=(a,o)=>{i=n(a,o);});let s=await t(e,r,t);return i?C(s):K$1(s)}function $s(e,t,r,n){let{node:i}=r,s=n.originalText.slice(i.sourceSpan.start.offset,i.sourceSpan.end.offset);return /^\s*$/u.test(s)?"":x$1(s,e,{parser:"__ng_directive",__isInHtmlAttribute:false},W$1)}var gn$1=$s;var zs=Array.prototype.toReversed??function(){return [...this].reverse()},Ys=xe$1("toReversed",function(){if(Array.isArray(this))return zs}),_n$1=Ys;function js(){let e=globalThis,t=e.Deno?.build?.os;return typeof t=="string"?t==="windows":e.navigator?.platform?.startsWith("Win")??e.process?.platform?.startsWith("win")??false}var Xs=js();function Sn$1(e){if(e=e instanceof URL?e:new URL(e),e.protocol!=="file:")throw new TypeError(`URL must be a file URL: received "${e.protocol}"`);return e}function Ks(e){return e=Sn$1(e),decodeURIComponent(e.pathname.replace(/%(?![0-9A-Fa-f]{2})/g,"%25"))}function Qs(e){e=Sn$1(e);let t=decodeURIComponent(e.pathname.replace(/\//g,"\\").replace(/%(?![0-9A-Fa-f]{2})/g,"%25")).replace(/^\\*([A-Za-z]:)(\\|$)/,"$1\\");return e.hostname!==""&&(t=`\\\\${e.hostname}${t}`),t}function ur$1(e){return Xs?Qs(e):Ks(e)}var En$1=e=>String(e).split(/[/\\]/u).pop(),Cn$1=e=>String(e).startsWith("file:");function Js(e){return Array.isArray(e)&&e.length>0}var Ie$1=Js;function vn$1(e,t){if(!t)return;let r=En$1(t).toLowerCase();return e.find(({filenames:n})=>n?.some(i=>i.toLowerCase()===r))??e.find(({extensions:n})=>n?.some(i=>r.endsWith(i)))}function Zs(e,t){if(t)return e.find(({name:r})=>r.toLowerCase()===t)??e.find(({aliases:r})=>r?.includes(t))??e.find(({extensions:r})=>r?.includes(`.${t}`))}var ea$1=void 0;function Tn$1(e,t){if(t){if(Cn$1(t))try{t=ur$1(t);}catch{return}if(typeof t=="string")return e.find(({isSupported:r})=>r?.({filepath:t}))}}function ta$1(e,t){let r=_n$1(0,e.plugins).flatMap(i=>i.languages??[]);return (Zs(r,t.language)??vn$1(r,t.physicalFile)??vn$1(r,t.file)??Tn$1(r,t.physicalFile)??Tn$1(r,t.file)??ea$1?.(r,t.physicalFile))?.parsers[0]}var At=ta$1;var yt=Symbol.for("PRETTIER_IS_FRONT_MATTER");function ra$1(e){return !!e?.[yt]}var ce$1=ra$1;var Xe$1=3;function na$1(e){let t=e.slice(0,Xe$1);if(t!=="---"&&t!=="+++")return;let r=e.indexOf(`
`,Xe$1);if(r===-1)return;let n=e.slice(Xe$1,r).trim(),i=e.indexOf(`
${t}`,r),s=n;if(s||(s=t==="+++"?"toml":"yaml"),i===-1&&t==="---"&&s==="yaml"&&(i=e.indexOf(`
...`,r)),i===-1)return;let a=i+1+Xe$1,o=e.charAt(a+1);if(!/\s?/u.test(o))return;let c=e.slice(0,a),u;return {language:s,explicitLanguage:n||null,value:e.slice(r+1,i),startDelimiter:t,endDelimiter:c.slice(-Xe$1),raw:c,start:{line:1,column:0,index:0},end:{index:c.length,get line(){return u??(u=c.split(`
`)),u.length},get column(){return u??(u=c.split(`
`)),F(0,u,-1).length}},[yt]:true}}function ia$1(e){let t=na$1(e);return t?{frontMatter:t,get content(){let{raw:r}=t;return w$1(0,r,/[^\n]/gu," ")+e.slice(r.length)}}:{content:e}}var pr$1=ia$1;var bn$1="inline",hr$1={area:"none",base:"none",basefont:"none",datalist:"none",head:"none",link:"none",meta:"none",noembed:"none",noframes:"none",param:"block",rp:"none",script:"block",style:"none",template:"inline",title:"none",html:"block",body:"block",address:"block",blockquote:"block",center:"block",dialog:"block",div:"block",figure:"block",figcaption:"block",footer:"block",form:"block",header:"block",hr:"block",legend:"block",listing:"block",main:"block",p:"block",plaintext:"block",pre:"block",search:"block",xmp:"block",slot:"contents",ruby:"ruby",rt:"ruby-text",article:"block",aside:"block",h1:"block",h2:"block",h3:"block",h4:"block",h5:"block",h6:"block",hgroup:"block",nav:"block",section:"block",dir:"block",dd:"block",dl:"block",dt:"block",menu:"block",ol:"block",ul:"block",li:"list-item",table:"table",caption:"table-caption",colgroup:"table-column-group",col:"table-column",thead:"table-header-group",tbody:"table-row-group",tfoot:"table-footer-group",tr:"table-row",td:"table-cell",th:"table-cell",input:"inline-block",button:"inline-block",fieldset:"block",details:"block",summary:"block",marquee:"inline-block",select:"inline-block",source:"block",track:"block",meter:"inline-block",progress:"inline-block",object:"inline-block",video:"inline-block",audio:"inline-block",option:"block",optgroup:"block"},wn$1="normal",mr$1={listing:"pre",plaintext:"pre",pre:"pre",xmp:"pre",nobr:"nowrap",table:"initial",textarea:"pre-wrap"};function sa$1(e){return e.kind==="element"&&!e.hasExplicitNamespace&&!["html","svg"].includes(e.namespace)}var ue$1=sa$1;var aa=e=>w$1(0,e,/^[\t\f\r ]*\n/gu,""),fr$1=e=>aa(y.trimEnd(e)),kn$1=e=>{let t=e,r=y.getLeadingWhitespace(t);r&&(t=t.slice(r.length));let n=y.getTrailingWhitespace(t);return n&&(t=t.slice(0,-n.length)),{leadingWhitespace:r,trailingWhitespace:n,text:t}};function Nt(e,t){return !!(e.kind==="ieConditionalComment"&&e.lastChild&&!e.lastChild.isSelfClosing&&!e.lastChild.endSourceSpan||e.kind==="ieConditionalComment"&&!e.complete||pe(e)&&e.children.some(r=>r.kind!=="text"&&r.kind!=="interpolation")||Ot(e,t)&&!H$1(e,t)&&e.kind!=="interpolation")}function he$1(e){return e.kind==="attribute"||!e.parent||!e.prev?false:oa$1(e.prev)}function oa$1(e){return e.kind==="comment"&&e.value.trim()==="prettier-ignore"}function O$1(e){return e.kind==="text"||e.kind==="comment"}function H$1(e,t){return e.kind==="element"&&(e.fullName==="script"||e.fullName==="style"||e.fullName==="svg:style"||e.fullName==="svg:script"||e.fullName==="mj-style"&&t.parser==="mjml"||ue$1(e)&&(e.name==="script"||e.name==="style"))}function xn$1(e,t){return e.children&&!H$1(e,t)}function An$1(e,t){return H$1(e,t)||e.kind==="interpolation"||dr$1(e)}function dr$1(e){return Fn$1(e).startsWith("pre")}function yn$1(e,t){let r=n();if(r&&!e.prev&&e.parent?.tagDefinition?.ignoreFirstLf)return e.kind==="interpolation";return r;function n(){return ce$1(e)||e.kind==="angularControlFlowBlock"?false:(e.kind==="text"||e.kind==="interpolation")&&e.prev&&(e.prev.kind==="text"||e.prev.kind==="interpolation")?true:!e.parent||e.parent.cssDisplay==="none"?false:pe(e.parent)?true:!(!e.prev&&(e.parent.kind==="root"||pe(e)&&e.parent||H$1(e.parent,t)||Je$1(e.parent,t)||!ma$1(e.parent.cssDisplay))||e.prev&&!ga$1(e.prev.cssDisplay))}}function Nn$1(e,t){return ce$1(e)||e.kind==="angularControlFlowBlock"?false:(e.kind==="text"||e.kind==="interpolation")&&e.next&&(e.next.kind==="text"||e.next.kind==="interpolation")?true:!e.parent||e.parent.cssDisplay==="none"?false:pe(e.parent)?true:!(!e.next&&(e.parent.kind==="root"||pe(e)&&e.parent||H$1(e.parent,t)||Je$1(e.parent,t)||!fa$1(e.parent.cssDisplay))||e.next&&!da$1(e.next.cssDisplay))}function Ln$1(e,t){return _a$1(e.cssDisplay)&&!H$1(e,t)}function Ke(e){return ce$1(e)||e.next&&e.sourceSpan.end&&e.sourceSpan.end.line+1<e.next.sourceSpan.start.line}function Pn$1(e){return gr$1(e)||e.kind==="element"&&e.children.length>0&&(["body","script","style"].includes(e.name)||e.children.some(t=>ca$1(t)))||e.firstChild&&e.firstChild===e.lastChild&&e.firstChild.kind!=="text"&&Dn$1(e.firstChild)&&(!e.lastChild.isTrailingSpaceSensitive||In$1(e.lastChild))}function gr$1(e){return e.kind==="element"&&e.children.length>0&&(["html","head","ul","ol","select"].includes(e.name)||e.cssDisplay.startsWith("table")&&e.cssDisplay!=="table-cell")}function Lt(e){return Rn$1(e)||e.prev&&la$1(e.prev)||On$1(e)}function la$1(e){return Rn$1(e)||e.kind==="element"&&e.fullName==="br"||On$1(e)}function On$1(e){return Dn$1(e)&&In$1(e)}function Dn$1(e){return e.hasLeadingSpaces&&(e.prev?e.prev.sourceSpan.end.line<e.sourceSpan.start.line:e.parent.kind==="root"||e.parent.startSourceSpan.end.line<e.sourceSpan.start.line)}function In$1(e){return e.hasTrailingSpaces&&(e.next?e.next.sourceSpan.start.line>e.sourceSpan.end.line:e.parent.kind==="root"||e.parent.endSourceSpan&&e.parent.endSourceSpan.start.line>e.sourceSpan.end.line)}function Rn$1(e){switch(e.kind){case "ieConditionalComment":case "comment":case "directive":return  true;case "element":return ["script","select"].includes(e.name)}return  false}function Pt(e){return e.lastChild?Pt(e.lastChild):e}function ca$1(e){return e.children?.some(t=>t.kind!=="text")}function Mn$1(e){if(e)switch(e){case "module":case "text/javascript":case "text/babel":case "text/jsx":case "application/javascript":return "babel";case "application/x-typescript":return "typescript";case "text/markdown":return "markdown";case "text/html":return "html";case "text/x-handlebars-template":return "glimmer";default:if(e.endsWith("json")||e.endsWith("importmap")||e==="speculationrules")return "json"}}function ua$1(e,t){let{name:r,attrMap:n}=e;if(r!=="script"||Object.prototype.hasOwnProperty.call(n,"src"))return;let{type:i,lang:s}=e.attrMap;return !s&&!i?"babel":At(t,{language:s})??Mn$1(i)}function pa$1(e,t){if(!Ot(e,t))return;let{attrMap:r}=e;if(Object.prototype.hasOwnProperty.call(r,"src"))return;let{type:n,lang:i}=r;return At(t,{language:i})??Mn$1(n)}function ha$1(e,t){if(e.name==="style"){let{lang:r}=e.attrMap;return r?At(t,{language:r}):"css"}if(e.name==="mj-style"&&t.parser==="mjml")return "css"}function _r$1(e,t){return ua$1(e,t)??ha$1(e,t)??pa$1(e,t)}function Qe$1(e){return e==="block"||e==="list-item"||e.startsWith("table")}function ma$1(e){return !Qe$1(e)&&e!=="inline-block"}function fa$1(e){return !Qe$1(e)&&e!=="inline-block"}function da$1(e){return !Qe$1(e)}function ga$1(e){return !Qe$1(e)}function _a$1(e){return !Qe$1(e)&&e!=="inline-block"}function pe(e){return Fn$1(e).startsWith("pre")}function Sa$1(e,t){let r=e;for(;r;){if(t(r))return  true;r=r.parent;}return  false}function Bn$1(e,t){if(me$1(e,t))return "block";if(e.prev?.kind==="comment"){let n=e.prev.value.match(/^\s*display:\s*([a-z]+)\s*$/u);if(n)return n[1]}let r=false;if(e.kind==="element"&&e.namespace==="svg")if(Sa$1(e,n=>n.fullName==="svg:foreignObject"))r=true;else return e.name==="svg"?"inline-block":"block";switch(t.htmlWhitespaceSensitivity){case "strict":return "inline";case "ignore":return "block";default:if(e.kind==="element"&&(!e.namespace||r||ue$1(e))&&Object.prototype.hasOwnProperty.call(hr$1,e.name))return hr$1[e.name]}return bn$1}function Fn$1(e){return e.kind==="element"&&(!e.namespace||ue$1(e))&&Object.prototype.hasOwnProperty.call(mr$1,e.name)?mr$1[e.name]:wn$1}function Sr$1(e){return w$1(0,w$1(0,e,"&apos;","'"),"&quot;",'"')}function b$1(e){return Sr$1(e.value)}var Ea$1=new Set(["template","style","script"]);function Je$1(e,t){return me$1(e,t)&&!Ea$1.has(e.fullName)}function me$1(e,t){return t.parser==="vue"&&e.kind==="element"&&e.parent.kind==="root"&&e.fullName.toLowerCase()!=="html"}function Ot(e,t){return me$1(e,t)&&(Je$1(e,t)||e.attrMap.lang&&e.attrMap.lang!=="html")}function qn(e){let t=e.fullName;return t.charAt(0)==="#"||t==="slot-scope"||t==="v-slot"||t.startsWith("v-slot:")}function Hn$1(e,t){let r=e.parent;if(!me$1(r,t))return  false;let n=r.fullName,i=e.fullName;return n==="script"&&i==="setup"||n==="style"&&i==="vars"}function Dt$1(e,t=e.value){return e.parent.isWhitespaceSensitive?e.parent.isIndentationSensitive?L$1(t):L$1(y.dedentString(fr$1(t)),v$1):q$1(_$1,y.split(t))}function It$1(e,t){return me$1(e,t)&&e.name==="script"}function Ca$1(e){let{valueSpan:t,value:r}=e;return t.end.offset-t.start.offset===r.length+2}function Rt(e,t){if(Ca$1(e))return  false;let{value:r}=e;return /^PRETTIER_HTML_PLACEHOLDER_\d+_\d+_IN_JS$/u.test(r)||t.parser==="lwc"&&r.startsWith("{")&&r.endsWith("}")}var Vn$1=/\{\{(.+?)\}\}/su,Un$1=({node:{value:e}})=>Vn$1.test(e);async function Wn$1(e,t,r){let n=b$1(r.node),i=[];for(let[s,a]of n.split(Vn$1).entries())if(s%2===0)i.push(L$1(a));else try{i.push(C(["{{",A([_$1,await x$1(a,e,{parser:"__ng_interpolation",__isInHtmlInterpolation:!0})]),_$1,"}}"]));}catch{i.push("{{",L$1(a),"}}");}return i}var Er$1=e=>(t,r,n)=>x$1(b$1(n.node),t,{parser:e},W$1),va$1=[{test(e){let t=e.node.fullName;return t.startsWith("(")&&t.endsWith(")")||t.startsWith("on-")},print:Er$1("__ng_action")},{test(e){let t=e.node.fullName;return t.startsWith("[")&&t.endsWith("]")||/^bind(?:on)?-/u.test(t)||/^ng-(?:if|show|hide|class|style)$/u.test(t)},print:Er$1("__ng_binding")},{test:e=>e.node.fullName.startsWith("*"),print:Er$1("__ng_directive")},{test:e=>/^i18n(?:-.+)?$/u.test(e.node.fullName),print:Ta$1},{test:Un$1,print:Wn$1}].map(({test:e,print:t})=>({test:(r,n)=>n.parser==="angular"&&e(r),print:t}));function Ta$1(e,t,{node:r}){let n=b$1(r);return K$1(xt(Dt$1(r,n.trim())),!n.includes("@@"))}var Gn$1=va$1;var $n$1=({node:e},t)=>!t.parentParser&&e.fullName==="class"&&!e.value.includes("{{"),zn$1=(e,t,r)=>b$1(r.node).trim().split(/\s+/u).join(" ");var Cr$1=["onabort","onafterprint","onauxclick","onbeforeinput","onbeforematch","onbeforeprint","onbeforetoggle","onbeforeunload","onblur","oncancel","oncanplay","oncanplaythrough","onchange","onclick","onclose","oncommand","oncontextlost","oncontextmenu","oncontextrestored","oncopy","oncuechange","oncut","ondblclick","ondrag","ondragend","ondragenter","ondragleave","ondragover","ondragstart","ondrop","ondurationchange","onemptied","onended","onerror","onfocus","onformdata","onhashchange","oninput","oninvalid","onkeydown","onkeypress","onkeyup","onlanguagechange","onload","onloadeddata","onloadedmetadata","onloadstart","onmessage","onmessageerror","onmousedown","onmouseenter","onmouseleave","onmousemove","onmouseout","onmouseover","onmouseup","onoffline","ononline","onpagehide","onpagereveal","onpageshow","onpageswap","onpaste","onpause","onplay","onplaying","onpopstate","onprogress","onratechange","onrejectionhandled","onreset","onresize","onscroll","onscrollend","onsecuritypolicyviolation","onseeked","onseeking","onselect","onslotchange","onstalled","onstorage","onsubmit","onsuspend","ontimeupdate","ontoggle","onunhandledrejection","onunload","onvolumechange","onwaiting","onwheel"];var wa$1=new Set(Cr$1),Yn$1=({node:e},t)=>wa$1.has(e.fullName)&&!t.parentParser&&!e.value.includes("{{"),jn$1=(e,t,r)=>x$1(b$1(r.node),e,{parser:"babel",__isHtmlInlineEventHandler:true},()=>false);function ka$1(e){let t=[];for(let r of e.split(";")){if(r=y.trim(r),!r)continue;let[n,...i]=y.split(r);t.push({name:n,value:i});}return t}var Xn=ka$1;var Kn$1=({node:e},t)=>e.fullName==="allow"&&!t.parentParser&&e.parent.fullName==="iframe"&&!e.value.includes("{{");function Qn(e,t,r){let{node:n}=r,i=Xn(b$1(n));return i.length===0?[""]:K$1(i.map(({name:s,value:a},o)=>[[s,...a].join(" "),o===i.length-1?X$1(";"):[";",_$1]]))}function Jn$1(e){return e==="	"||e===`
`||e==="\f"||e==="\r"||e===" "}var xa$1=/^[ \t\n\r\u000c]+/,Aa=/^[, \t\n\r\u000c]+/,ya$1=/^[^ \t\n\r\u000c]+/,Na$1=/[,]+$/,Zn$1=/^\d+$/,La$1=/^-?(?:[0-9]+|[0-9]*\.[0-9]+)(?:[eE][+-]?[0-9]+)?$/;function Pa$1(e){let t=e.length,r,n,i,s,a,o=0,c;function u(m){let g,E=m.exec(e.substring(o));if(E)return [g]=E,o+=g.length,g}let p=[];for(;;){if(u(Aa),o>=t){if(p.length===0)throw new Error("Must contain one or more image candidate strings.");return p}c=o,r=u(ya$1),n=[],r.slice(-1)===","?(r=r.replace(Na$1,""),S()):d();}function d(){for(u(xa$1),i="",s="in descriptor";;){if(a=e.charAt(o),s==="in descriptor")if(Jn$1(a))i&&(n.push(i),i="",s="after descriptor");else if(a===","){o+=1,i&&n.push(i),S();return}else if(a==="(")i+=a,s="in parens";else if(a===""){i&&n.push(i),S();return}else i+=a;else if(s==="in parens")if(a===")")i+=a,s="in descriptor";else if(a===""){n.push(i),S();return}else i+=a;else if(s==="after descriptor"&&!Jn$1(a))if(a===""){S();return}else s="in descriptor",o-=1;o+=1;}}function S(){let m=false,g,E,P,z,le={},ee,_t,ke,Ge,nr;for(z=0;z<n.length;z++)ee=n[z],_t=ee[ee.length-1],ke=ee.substring(0,ee.length-1),Ge=parseInt(ke,10),nr=parseFloat(ke),Zn$1.test(ke)&&_t==="w"?((g||E)&&(m=true),Ge===0?m=true:g=Ge):La$1.test(ke)&&_t==="x"?((g||E||P)&&(m=true),nr<0?m=true:E=nr):Zn$1.test(ke)&&_t==="h"?((P||E)&&(m=true),Ge===0?m=true:P=Ge):m=true;if(!m)le.source={value:r,startOffset:c},g&&(le.width={value:g}),E&&(le.density={value:E}),P&&(le.height={value:P}),p.push(le);else throw new Error(`Invalid srcset descriptor found in "${e}" at "${ee}".`)}}var ei$1=Pa$1;var ti$1=e=>e.node.fullName==="srcset"&&(e.parent.fullName==="img"||e.parent.fullName==="source"),ri$1={width:"w",height:"h",density:"x"},Oa$1=Object.keys(ri$1);function ni$1(e,t,r){let n=b$1(r.node),i=ei$1(n),s=Oa$1.filter(m=>i.some(g=>Object.prototype.hasOwnProperty.call(g,m)));if(s.length>1)throw new Error("Mixed descriptor in srcset is not supported");let[a]=s,o=ri$1[a],c=i.map(m=>m.source.value),u=Math.max(...c.map(m=>m.length)),p=i.map(m=>m[a]?String(m[a].value):""),d=p.map(m=>{let g=m.indexOf(".");return g===-1?m.length:g}),S=Math.max(...d);return K$1(q$1([",",_$1],c.map((m,g)=>{let E=[m],P=p[g];if(P){let z=u-m.length+1,le=S-d[g],ee=" ".repeat(z+le);E.push(X$1(ee," "),P+o);}return E})))}var ii$1=({node:e},t)=>e.fullName==="style"&&!t.parentParser&&!e.value.includes("{{"),si$1=async(e,t,r)=>K$1(await e(b$1(r.node),{parser:"css",__isHTMLStyleAttribute:true}));var vr$1=new WeakMap;function Da$1(e,t){let{root:r}=e;return vr$1.has(r)||vr$1.set(r,r.children.some(n=>It$1(n,t)&&["ts","typescript"].includes(n.attrMap.lang))),vr$1.get(r)}var G$1=Da$1;function ai$1(e,t,r){let n=b$1(r.node);return x$1(`type T<${n}> = any`,e,{parser:"babel-ts",__isEmbeddedTypescriptGenericParameters:true},W$1)}function oi$1(e,t,r,n){let i=b$1(r.node),s=G$1(r,n)?"babel-ts":"babel";return x$1(`function _(${i}) {}`,e,{parser:s,__isVueBindings:true})}async function li$1(e,t,r,n){let i=b$1(r.node),{left:s,operator:a,right:o}=Ia$1(i),c=G$1(r,n);return [C(await x$1(`function _(${s}) {}`,e,{parser:c?"babel-ts":"babel",__isVueForBindingLeft:true}))," ",a," ",await x$1(o,e,{parser:c?"__ts_expression":"__js_expression"})]}function Ia$1(e){let t=/(.*?)\s+(in|of)\s+(.*)/su,r=/,([^,\]}]*)(?:,([^,\]}]*))?$/u,n=/^\(|\)$/gu,i=e.match(t);if(!i)return;let s={for:i[3].trim()};if(!s.for)return;let a=w$1(0,i[1].trim(),n,""),o=a.match(r);o?(s.alias=a.replace(r,""),s.iterator1=o[1].trim(),o[2]&&(s.iterator2=o[2].trim())):s.alias=a;let c=[s.alias,s.iterator1,s.iterator2];if(!c.some((u,p)=>!u&&(p===0||c.slice(p+1).some(Boolean))))return {left:c.filter(Boolean).join(","),operator:i[2],right:s.for}}var Ra$1=[{test:e=>e.node.fullName==="v-for",print:li$1},{test:(e,t)=>e.node.fullName==="generic"&&It$1(e.parent,t),print:ai$1},{test:({node:e},t)=>qn(e)||Hn$1(e,t),print:oi$1},{test(e){let t=e.node.fullName;return t.startsWith("@")||t.startsWith("v-on:")},print:Ma$1},{test(e){let t=e.node.fullName;return t.startsWith(":")||t.startsWith(".")||t.startsWith("v-bind:")},print:Ba$1},{test:e=>e.node.fullName.startsWith("v-"),print:ci$1}].map(({test:e,print:t})=>({test:(r,n)=>n.parser==="vue"&&e(r,n),print:t}));async function Ma$1(e,t,r,n){try{return await ci$1(e,t,r,n)}catch(a){if(a.cause?.code!=="BABEL_PARSER_SYNTAX_ERROR")throw a}let i=b$1(r.node),s=G$1(r,n)?"__vue_ts_event_binding":"__vue_event_binding";return x$1(i,e,{parser:s},W$1)}function Ba$1(e,t,r,n){let i=b$1(r.node),s=G$1(r,n)?"__vue_ts_expression":"__vue_expression";return x$1(i,e,{parser:s},W$1)}function ci$1(e,t,r,n){let i=b$1(r.node),s=G$1(r,n)?"__ts_expression":"__js_expression";return x$1(i,e,{parser:s},W$1)}var ui$1=Ra$1;var Fa$1=[{test:ti$1,print:ni$1},{test:ii$1,print:si$1},{test:Yn$1,print:jn$1},{test:$n$1,print:zn$1},{test:Kn$1,print:Qn},...ui$1,...Gn$1].map(({test:e,print:t})=>({test:e,print:Ha$1(t)}));function qa$1(e,t){let{node:r}=e,{value:n}=r;if(n)return Rt(r,t)?[r.rawName,"=",n]:Fa$1.find(({test:i})=>i(e,t))?.print}function Ha$1(e){return async(t,r,n,i)=>{let s=await e(t,r,n,i);if(s)return s=ar$1(s,a=>typeof a=="string"?w$1(0,a,'"',"&quot;"):a),[n.node.rawName,'="',C(s),'"']}}var pi=qa$1;var Q=e=>e.sourceSpan.start.offset,te$1=e=>e.sourceSpan.end.offset;function Ze$1(e,t){return [e.isSelfClosing?"":Va$1(e,t),fe$1(e,t)]}function Va$1(e,t){return e.lastChild&&_e$1(e.lastChild)?"":[Ua(e,t),Mt$1(e,t)]}function fe$1(e,t){return (e.next?$$1(e.next):ge$1(e.parent))?"":[de$1(e,t),V$1(e,t)]}function Ua(e,t){return ge$1(e)?de$1(e.lastChild,t):""}function V$1(e,t){return _e$1(e)?Mt$1(e.parent,t):et$1(e)?Bt(e.next,t):""}function Mt$1(e,t){if(mi(e,t))return "";switch(e.kind){case "ieConditionalComment":return "<!";case "element":if(e.hasHtmComponentClosingTag)return "<//";default:return `</${e.rawName}`}}function de$1(e,t){if(mi(e,t))return "";switch(e.kind){case "ieConditionalComment":case "ieConditionalEndComment":return "[endif]-->";case "ieConditionalStartComment":return "]><!-->";case "interpolation":return "}}";case "angularIcuExpression":return "}";case "element":if(e.isSelfClosing)return "/>";default:return ">"}}function mi(e,t){return !e.isSelfClosing&&!e.endSourceSpan&&(he$1(e)||Nt(e.parent,t))}function $$1(e){return e.prev&&e.prev.kind!=="docType"&&e.kind!=="angularControlFlowBlock"&&!O$1(e.prev)&&e.isLeadingSpaceSensitive&&!e.hasLeadingSpaces}function ge$1(e){return e.lastChild?.isTrailingSpaceSensitive&&!e.lastChild.hasTrailingSpaces&&!O$1(Pt(e.lastChild))&&!pe(e)}function _e$1(e){return !e.next&&!e.hasTrailingSpaces&&e.isTrailingSpaceSensitive&&O$1(Pt(e))}function et$1(e){return e.next&&!O$1(e.next)&&O$1(e)&&e.isTrailingSpaceSensitive&&!e.hasTrailingSpaces}function Wa$1(e){let t=e.trim().match(/^prettier-ignore-attribute(?:\s+(.+))?$/su);return t?t[1]?t[1].split(/\s+/u):true:false}function tt$1(e){return !e.prev&&e.isLeadingSpaceSensitive&&!e.hasLeadingSpaces}function Ga$1(e,t,r){let{node:n}=e;if(!Ie$1(n.attrs))return n.isSelfClosing?" ":"";let i=n.prev?.kind==="comment"&&Wa$1(n.prev.value),s=typeof i=="boolean"?()=>i:Array.isArray(i)?d=>i.includes(d.rawName):()=>false,a=e.map(({node:d})=>s(d)?L$1(t.originalText.slice(Q(d),te$1(d))):r(),"attrs"),o=n.kind==="element"&&n.fullName==="script"&&n.attrs.length===1&&n.attrs[0].fullName==="src"&&n.children.length===0,u=t.singleAttributePerLine&&n.attrs.length>1&&!me$1(n,t)?v$1:_$1,p=[A([o?" ":_$1,q$1(u,a)])];return n.firstChild&&tt$1(n.firstChild)||n.isSelfClosing&&ge$1(n.parent)||o?p.push(n.isSelfClosing?" ":""):p.push(t.bracketSameLine?n.isSelfClosing?" ":"":n.isSelfClosing?_$1:k$1),p}function $a$1(e){return e.firstChild&&tt$1(e.firstChild)?"":Ft$1(e)}function rt$1(e,t,r){let{node:n}=e;return [Se$1(n,t),Ga$1(e,t,r),n.isSelfClosing?"":$a$1(n)]}function Se$1(e,t){return e.prev&&et$1(e.prev)?"":[U$1(e,t),Bt(e,t)]}function U$1(e,t){return tt$1(e)?Ft$1(e.parent):$$1(e)?de$1(e.prev,t):""}var hi="<!doctype";function Bt(e,t){switch(e.kind){case "ieConditionalComment":case "ieConditionalStartComment":return `<!--[if ${e.condition}`;case "ieConditionalEndComment":return "<!--<!";case "interpolation":return "{{";case "docType":{if(e.value==="html"){let{filepath:n}=t;if(n&&/\.html?$/u.test(n))return hi}let r=Q(e);return t.originalText.slice(r,r+hi.length)}case "angularIcuExpression":return "{";case "element":if(e.condition)return `<!--[if ${e.condition}]><!--><${e.rawName}`;default:return `<${e.rawName}`}}function Ft$1(e){switch(e.kind){case "ieConditionalComment":return "]>";case "element":if(e.condition)return "><!--<![endif]-->";default:return ">"}}function za$1(e,t){if(!e.endSourceSpan)return "";let r=e.startSourceSpan.end.offset;e.firstChild&&tt$1(e.firstChild)&&(r-=Ft$1(e).length);let n=e.endSourceSpan.start.offset;return e.lastChild&&_e$1(e.lastChild)?n+=Mt$1(e,t).length:ge$1(e)&&(n-=de$1(e.lastChild,t).length),t.originalText.slice(r,n)}var qt$1=za$1;var Ya$1=new Set(["if","else if","for","switch","case"]);function ja$1(e,t){let{node:r}=e;switch(r.kind){case "element":if(H$1(r,t)||r.kind==="interpolation")return;if(!r.isSelfClosing&&Ot(r,t)){let n=_r$1(r,t);return n?async(i,s)=>{let a=qt$1(r,t),o=/^\s*$/u.test(a),c="";return o||(c=await i(fr$1(a),{parser:n,__embeddedInHtml:true}),o=c===""),[U$1(r,t),C(rt$1(e,t,s)),o?"":v$1,c,o?"":v$1,Ze$1(r,t),V$1(r,t)]}:void 0}break;case "text":if(H$1(r.parent,t)){let n=_r$1(r.parent,t);if(n)return async i=>{let s=n==="markdown"?y.dedentString(r.value.replace(/^[^\S\n]*\n/u,"")):r.value,a={parser:n,__embeddedInHtml:true};if(t.parser==="html"&&n==="babel"){let o="script",{attrMap:c}=r.parent;c&&(c.type==="module"||(c.type==="text/babel"||c.type==="text/jsx")&&c["data-type"]==="module")&&(o="module"),a.__babelSourceType=o;}return [j$1,U$1(r,t),await i(s,a),V$1(r,t)]}}else if(r.parent.kind==="interpolation")return async n=>{let i={__isInHtmlInterpolation:true,__embeddedInHtml:true};return t.parser==="angular"?i.parser="__ng_interpolation":t.parser==="vue"?i.parser=G$1(e,t)?"__vue_ts_expression":"__vue_expression":i.parser="__js_expression",[A([_$1,await n(r.value,i)]),r.parent.next&&$$1(r.parent.next)?" ":_$1]};break;case "attribute":return pi(e,t);case "angularControlFlowBlockParameters":return Ya$1.has(e.parent.name)?gn$1:void 0;case "angularLetDeclarationInitializer":return n=>x$1(r.value,n,{parser:"__ng_binding",__isInHtmlAttribute:false})}}var fi$1=ja$1;var nt$1=null;function it$1(e){if(nt$1!==null&&typeof nt$1.property){let t=nt$1;return nt$1=it$1.prototype=null,t}return nt$1=it$1.prototype=e??Object.create(null),new it$1}var Xa$1=10;for(let e=0;e<=Xa$1;e++)it$1();function Tr$1(e){return it$1(e)}function Ka$1(e,t="type"){Tr$1(e);function r(n){let i=n[t],s=e[i];if(!Array.isArray(s))throw Object.assign(new Error(`Missing visitor keys for '${i}'.`),{node:n});return s}return r}var di=Ka$1;var I$1=[["children"],[]],gi={root:I$1[0],element:["attrs","children"],ieConditionalComment:I$1[0],ieConditionalStartComment:I$1[1],ieConditionalEndComment:I$1[1],interpolation:I$1[0],text:I$1[0],docType:I$1[1],comment:I$1[1],attribute:I$1[1],cdata:I$1[1],angularControlFlowBlock:["children","parameters"],angularControlFlowBlockParameters:I$1[0],angularControlFlowBlockParameter:I$1[1],angularLetDeclaration:["init"],angularLetDeclarationInitializer:I$1[1],angularIcuExpression:["cases"],angularIcuCase:["expression"]};var Qa$1=di(gi,"kind"),_i=Qa$1;var Si="format";var Ei=/^\s*<!--\s*@(?:noformat|noprettier)\s*-->/u,Ci=/^\s*<!--\s*@(?:format|prettier)\s*-->/u;var vi=e=>Ci.test(e),Ti=e=>Ei.test(e),bi=e=>`<!-- @${Si} -->

${e}`;var wi=new Map([["if",new Set(["else if","else"])],["else if",new Set(["else if","else"])],["for",new Set(["empty"])],["defer",new Set(["placeholder","error","loading"])],["placeholder",new Set(["placeholder","error","loading"])],["error",new Set(["placeholder","error","loading"])],["loading",new Set(["placeholder","error","loading"])]]);function ki(e){let t=te$1(e);return e.kind==="element"&&!e.endSourceSpan&&Ie$1(e.children)?Math.max(t,ki(F(0,e.children,-1))):t}function st$1(e,t,r){let n=e.node;if(he$1(n)){let i=ki(n);return [U$1(n,t),L$1(y.trimEnd(t.originalText.slice(Q(n)+(n.prev&&et$1(n.prev)?Bt(n).length:0),i-(n.next&&$$1(n.next)?de$1(n,t).length:0)))),V$1(n,t)]}return r()}function Ht$1(e,t){return O$1(e)&&O$1(t)?e.isTrailingSpaceSensitive?e.hasTrailingSpaces?Lt(t)?v$1:_$1:"":Lt(t)?v$1:k$1:et$1(e)&&(he$1(t)||t.firstChild||t.isSelfClosing||t.kind==="element"&&t.attrs.length>0)||e.kind==="element"&&e.isSelfClosing&&$$1(t)?"":!t.isLeadingSpaceSensitive||Lt(t)||$$1(t)&&e.lastChild&&_e$1(e.lastChild)&&e.lastChild.lastChild&&_e$1(e.lastChild.lastChild)?v$1:t.hasLeadingSpaces?_$1:k$1}function Re$1(e,t,r){let{node:n}=e;if(gr$1(n))return [j$1,...e.map(()=>{let s=e.node,a=s.prev?Ht$1(s.prev,s):"";return [a?[a,Ke(s.prev)?v$1:""]:"",st$1(e,t,r)]},"children")];let i=n.children.map(()=>Symbol(""));return e.map(({node:s,index:a})=>{if(O$1(s)){if(s.prev&&O$1(s.prev)){let m=Ht$1(s.prev,s);if(m)return Ke(s.prev)?[v$1,v$1,st$1(e,t,r)]:[m,st$1(e,t,r)]}return st$1(e,t,r)}let o=[],c=[],u=[],p=[],d=s.prev?Ht$1(s.prev,s):"",S=s.next?Ht$1(s,s.next):"";return d&&(Ke(s.prev)?o.push(v$1,v$1):d===v$1?o.push(v$1):O$1(s.prev)?c.push(d):c.push(X$1("",k$1,{groupId:i[a-1]}))),S&&(Ke(s)?O$1(s.next)&&p.push(v$1,v$1):S===v$1?O$1(s.next)&&p.push(v$1):u.push(S)),[...o,C([...c,C([st$1(e,t,r),...u],{id:i[a]})]),...p]},"children")}function xi(e,t,r){let{node:n}=e,i=[];if(eo$1(e)&&i.push("} "),i.push("@",n.name),n.parameters&&i.push(" (",C(r("parameters")),")"),!Za$1(n)){i.push(" {");let s=Ai(n);n.children.length>0?(n.firstChild.hasLeadingSpaces=true,n.lastChild.hasTrailingSpaces=true,i.push(A([v$1,Re$1(e,t,r)])),s&&i.push(v$1,"}")):s&&i.push("}");}return C(i,{shouldBreak:true})}function Ai(e){return !(e.next?.kind==="angularControlFlowBlock"&&wi.get(e.name)?.has(e.next.name))}var Ja$1=e=>e?.kind==="angularControlFlowBlock"&&(e.name==="case"||e.name==="default");function Za$1(e){return Ja$1(e)&&e.endSourceSpan&&e.endSourceSpan.start.offset===e.endSourceSpan.end.offset}function eo$1(e){let{previous:t}=e;return t?.kind==="angularControlFlowBlock"&&!he$1(t)&&!Ai(t)}function yi(e,t,r){return [A([k$1,q$1([";",_$1],e.map(r,"children"))]),k$1]}function Ni(e,t,r){let{node:n}=e;return [Se$1(n,t),C([n.switchValue.trim(),", ",n.type,n.cases.length>0?[",",A([_$1,q$1(_$1,e.map(r,"cases"))])]:"",k$1]),fe$1(n,t)]}function Li(e,t,r){let{node:n}=e;return [n.value," {",C([A([k$1,e.map(({node:i,isLast:s})=>{let a=[r()];return i.kind==="text"&&(i.hasLeadingSpaces&&a.unshift(_$1),i.hasTrailingSpaces&&!s&&a.push(_$1)),a},"expression")]),k$1]),"}"]}function Pi(e,t,r){let{node:n}=e;if(Nt(n,t))return [U$1(n,t),C(rt$1(e,t,r)),L$1(qt$1(n,t)),...Ze$1(n,t),V$1(n,t)];let i=n.children.length===1&&(n.firstChild.kind==="interpolation"||n.firstChild.kind==="angularIcuExpression")&&n.firstChild.isLeadingSpaceSensitive&&!n.firstChild.hasLeadingSpaces&&n.lastChild.isTrailingSpaceSensitive&&!n.lastChild.hasTrailingSpaces,s=Symbol("element-attr-group-id"),a=p=>C([C(rt$1(e,t,r),{id:s}),p,Ze$1(n,t)]),o=p=>i?ln(p,{groupId:s}):(H$1(n,t)||Je$1(n,t))&&n.parent.kind==="root"&&t.parser==="vue"&&!t.vueIndentScriptAndStyle?p:A(p),c=()=>i?X$1(k$1,"",{groupId:s}):n.firstChild.hasLeadingSpaces&&n.firstChild.isLeadingSpaceSensitive?_$1:n.firstChild.kind==="text"&&n.isWhitespaceSensitive&&n.isIndentationSensitive?on$1(k$1):k$1,u=()=>(n.next?$$1(n.next):ge$1(n.parent))?n.lastChild.hasTrailingSpaces&&n.lastChild.isTrailingSpaceSensitive?" ":"":i?X$1(k$1,"",{groupId:s}):n.lastChild.hasTrailingSpaces&&n.lastChild.isTrailingSpaceSensitive?_$1:(n.lastChild.kind==="comment"||n.lastChild.kind==="text"&&n.isWhitespaceSensitive&&n.isIndentationSensitive)&&new RegExp(`\\n[\\t ]{${t.tabWidth*(e.ancestors.length-1)}}$`,"u").test(n.lastChild.value)?"":k$1;return n.children.length===0?a(n.hasDanglingSpaces&&n.isDanglingSpaceSensitive?_$1:""):a([Pn$1(n)?j$1:"",o([c(),Re$1(e,t,r)]),u()])}var R$1=(function(e){return e[e.RAW_TEXT=0]="RAW_TEXT",e[e.ESCAPABLE_RAW_TEXT=1]="ESCAPABLE_RAW_TEXT",e[e.PARSABLE_DATA=2]="PARSABLE_DATA",e})({});function at$1(e,t=true){if(e[0]!=":")return [null,e];let r=e.indexOf(":",1);if(r===-1){if(t)throw new Error(`Unsupported format "${e}" expecting ":namespace:name"`);return [null,e]}return [e.slice(1,r),e.slice(r+1)]}function br$1(e){return at$1(e)[1]==="ng-container"}function wr$1(e){return at$1(e)[1]==="ng-content"}function Me$1(e){return e===null?null:at$1(e)[0]}function Ee$1(e,t){return e?`:${e}:${t}`:t}var kr$1={name:"custom-elements"},xr$1={name:"no-errors-schema"},re=(function(e){return e[e.NONE=0]="NONE",e[e.HTML=1]="HTML",e[e.STYLE=2]="STYLE",e[e.SCRIPT=3]="SCRIPT",e[e.URL=4]="URL",e[e.RESOURCE_URL=5]="RESOURCE_URL",e[e.ATTRIBUTE_NO_BINDING=6]="ATTRIBUTE_NO_BINDING",e})({});var to$1=/-+([a-z0-9])/g;function Oi(e){return e.replace(to$1,(...t)=>t[1].toUpperCase())}var Vt$1;function Ar$1(){return Vt$1||(Vt$1={},ot$1(re.HTML,["iframe|srcdoc","*|innerHTML","*|outerHTML"]),ot$1(re.STYLE,["*|style"]),ot$1(re.URL,["*|formAction","area|href","a|href","a|xlink:href","form|action","annotation|href","annotation|xlink:href","annotation-xml|href","annotation-xml|xlink:href","maction|href","maction|xlink:href","malignmark|href","malignmark|xlink:href","math|href","math|xlink:href","mroot|href","mroot|xlink:href","msqrt|href","msqrt|xlink:href","merror|href","merror|xlink:href","mfrac|href","mfrac|xlink:href","mglyph|href","mglyph|xlink:href","msub|href","msub|xlink:href","msup|href","msup|xlink:href","msubsup|href","msubsup|xlink:href","mmultiscripts|href","mmultiscripts|xlink:href","mprescripts|href","mprescripts|xlink:href","mi|href","mi|xlink:href","mn|href","mn|xlink:href","mo|href","mo|xlink:href","mpadded|href","mpadded|xlink:href","mphantom|href","mphantom|xlink:href","mrow|href","mrow|xlink:href","ms|href","ms|xlink:href","mspace|href","mspace|xlink:href","mstyle|href","mstyle|xlink:href","mtable|href","mtable|xlink:href","mtd|href","mtd|xlink:href","mtr|href","mtr|xlink:href","mtext|href","mtext|xlink:href","mover|href","mover|xlink:href","munder|href","munder|xlink:href","munderover|href","munderover|xlink:href","semantics|href","semantics|xlink:href","none|href","none|xlink:href","img|src","video|src"]),ot$1(re.RESOURCE_URL,["base|href","embed|src","frame|src","iframe|src","link|href","object|codebase","object|data","script|src","script|href","script|xlink:href"]),ot$1(re.ATTRIBUTE_NO_BINDING,["animate|attributeName","set|attributeName","animateMotion|attributeName","animateTransform|attributeName","unknown|attributeName","iframe|sandbox","iframe|allow","iframe|allowFullscreen","iframe|referrerPolicy","iframe|csp","iframe|fetchPriority","unknown|sandbox","unknown|allow","unknown|allowFullscreen","unknown|referrerPolicy","unknown|csp","unknown|fetchPriority"])),Vt$1}function ot$1(e,t){for(let r of t)Vt$1[r.toLowerCase()]=e;}var Di$1=class Di{};var ro$1="boolean",no$1="number",io$1="string",so$1="object",ao$1=["[Element]|textContent,%ariaActiveDescendantElement,%ariaAtomic,%ariaAutoComplete,%ariaBusy,%ariaChecked,%ariaColCount,%ariaColIndex,%ariaColIndexText,%ariaColSpan,%ariaControlsElements,%ariaCurrent,%ariaDescribedByElements,%ariaDescription,%ariaDetailsElements,%ariaDisabled,%ariaErrorMessageElements,%ariaExpanded,%ariaFlowToElements,%ariaHasPopup,%ariaHidden,%ariaInvalid,%ariaKeyShortcuts,%ariaLabel,%ariaLabelledByElements,%ariaLevel,%ariaLive,%ariaModal,%ariaMultiLine,%ariaMultiSelectable,%ariaOrientation,%ariaOwnsElements,%ariaPlaceholder,%ariaPosInSet,%ariaPressed,%ariaReadOnly,%ariaRelevant,%ariaRequired,%ariaRoleDescription,%ariaRowCount,%ariaRowIndex,%ariaRowIndexText,%ariaRowSpan,%ariaSelected,%ariaSetSize,%ariaSort,%ariaValueMax,%ariaValueMin,%ariaValueNow,%ariaValueText,%classList,className,elementTiming,id,innerHTML,*beforecopy,*beforecut,*beforepaste,*fullscreenchange,*fullscreenerror,*search,*webkitfullscreenchange,*webkitfullscreenerror,outerHTML,%part,#scrollLeft,#scrollTop,slot,*message,*mozfullscreenchange,*mozfullscreenerror,*mozpointerlockchange,*mozpointerlockerror,*webglcontextcreationerror,*webglcontextlost,*webglcontextrestored","[HTMLElement]^[Element]|accessKey,autocapitalize,!autofocus,contentEditable,dir,!draggable,enterKeyHint,!hidden,!inert,innerText,inputMode,lang,nonce,*abort,*animationend,*animationiteration,*animationstart,*auxclick,*beforexrselect,*blur,*cancel,*canplay,*canplaythrough,*change,*click,*close,*contextmenu,*copy,*cuechange,*cut,*dblclick,*drag,*dragend,*dragenter,*dragleave,*dragover,*dragstart,*drop,*durationchange,*emptied,*ended,*error,*focus,*formdata,*gotpointercapture,*input,*invalid,*keydown,*keypress,*keyup,*load,*loadeddata,*loadedmetadata,*loadstart,*lostpointercapture,*mousedown,*mouseenter,*mouseleave,*mousemove,*mouseout,*mouseover,*mouseup,*mousewheel,*paste,*pause,*play,*playing,*pointercancel,*pointerdown,*pointerenter,*pointerleave,*pointermove,*pointerout,*pointerover,*pointerrawupdate,*pointerup,*progress,*ratechange,*reset,*resize,*scroll,*securitypolicyviolation,*seeked,*seeking,*select,*selectionchange,*selectstart,*slotchange,*stalled,*submit,*suspend,*timeupdate,*toggle,*transitioncancel,*transitionend,*transitionrun,*transitionstart,*volumechange,*waiting,*webkitanimationend,*webkitanimationiteration,*webkitanimationstart,*webkittransitionend,*wheel,outerText,!spellcheck,%style,#tabIndex,title,!translate,virtualKeyboardPolicy","abbr,address,article,aside,b,bdi,bdo,cite,content,code,dd,dfn,dt,em,figcaption,figure,footer,header,hgroup,i,kbd,main,mark,nav,noscript,rb,rp,rt,rtc,ruby,s,samp,search,section,small,strong,sub,sup,u,var,wbr^[HTMLElement]|accessKey,autocapitalize,!autofocus,contentEditable,dir,!draggable,enterKeyHint,!hidden,innerText,inputMode,lang,nonce,*abort,*animationend,*animationiteration,*animationstart,*auxclick,*beforexrselect,*blur,*cancel,*canplay,*canplaythrough,*change,*click,*close,*contextmenu,*copy,*cuechange,*cut,*dblclick,*drag,*dragend,*dragenter,*dragleave,*dragover,*dragstart,*drop,*durationchange,*emptied,*ended,*error,*focus,*formdata,*gotpointercapture,*input,*invalid,*keydown,*keypress,*keyup,*load,*loadeddata,*loadedmetadata,*loadstart,*lostpointercapture,*mousedown,*mouseenter,*mouseleave,*mousemove,*mouseout,*mouseover,*mouseup,*mousewheel,*paste,*pause,*play,*playing,*pointercancel,*pointerdown,*pointerenter,*pointerleave,*pointermove,*pointerout,*pointerover,*pointerrawupdate,*pointerup,*progress,*ratechange,*reset,*resize,*scroll,*securitypolicyviolation,*seeked,*seeking,*select,*selectionchange,*selectstart,*slotchange,*stalled,*submit,*suspend,*timeupdate,*toggle,*transitioncancel,*transitionend,*transitionrun,*transitionstart,*volumechange,*waiting,*webkitanimationend,*webkitanimationiteration,*webkitanimationstart,*webkittransitionend,*wheel,outerText,!spellcheck,%style,#tabIndex,title,!translate,virtualKeyboardPolicy","media^[HTMLElement]|!autoplay,!controls,%controlsList,%crossOrigin,#currentTime,!defaultMuted,#defaultPlaybackRate,!disableRemotePlayback,!loop,!muted,*encrypted,*waitingforkey,#playbackRate,preload,!preservesPitch,src,%srcObject,#volume",":svg:^[HTMLElement]|!autofocus,nonce,*abort,*animationend,*animationiteration,*animationstart,*auxclick,*beforexrselect,*blur,*cancel,*canplay,*canplaythrough,*change,*click,*close,*contextmenu,*copy,*cuechange,*cut,*dblclick,*drag,*dragend,*dragenter,*dragleave,*dragover,*dragstart,*drop,*durationchange,*emptied,*ended,*error,*focus,*formdata,*gotpointercapture,*input,*invalid,*keydown,*keypress,*keyup,*load,*loadeddata,*loadedmetadata,*loadstart,*lostpointercapture,*mousedown,*mouseenter,*mouseleave,*mousemove,*mouseout,*mouseover,*mouseup,*mousewheel,*paste,*pause,*play,*playing,*pointercancel,*pointerdown,*pointerenter,*pointerleave,*pointermove,*pointerout,*pointerover,*pointerrawupdate,*pointerup,*progress,*ratechange,*reset,*resize,*scroll,*securitypolicyviolation,*seeked,*seeking,*select,*selectionchange,*selectstart,*slotchange,*stalled,*submit,*suspend,*timeupdate,*toggle,*transitioncancel,*transitionend,*transitionrun,*transitionstart,*volumechange,*waiting,*webkitanimationend,*webkitanimationiteration,*webkitanimationstart,*webkittransitionend,*wheel,%style,#tabIndex",":svg:graphics^:svg:|",":svg:animation^:svg:|*begin,*end,*repeat",":svg:geometry^:svg:|",":svg:componentTransferFunction^:svg:|",":svg:gradient^:svg:|",":svg:textContent^:svg:graphics|",":svg:textPositioning^:svg:textContent|","a^[HTMLElement]|charset,coords,download,hash,host,hostname,href,hreflang,name,password,pathname,ping,port,protocol,referrerPolicy,rel,%relList,rev,search,shape,target,text,type,username","area^[HTMLElement]|alt,coords,download,hash,host,hostname,href,!noHref,password,pathname,ping,port,protocol,referrerPolicy,rel,%relList,search,shape,target,username","audio^media|","br^[HTMLElement]|clear","base^[HTMLElement]|href,target","body^[HTMLElement]|aLink,background,bgColor,link,*afterprint,*beforeprint,*beforeunload,*blur,*error,*focus,*hashchange,*languagechange,*load,*message,*messageerror,*offline,*online,*pagehide,*pageshow,*popstate,*rejectionhandled,*resize,*scroll,*storage,*unhandledrejection,*unload,text,vLink","button^[HTMLElement]|!disabled,formAction,formEnctype,formMethod,!formNoValidate,formTarget,name,type,value","canvas^[HTMLElement]|#height,#width","content^[HTMLElement]|select","dl^[HTMLElement]|!compact","data^[HTMLElement]|value","datalist^[HTMLElement]|","details^[HTMLElement]|!open","dialog^[HTMLElement]|!open,returnValue","dir^[HTMLElement]|!compact","div^[HTMLElement]|align","embed^[HTMLElement]|align,height,name,src,type,width","fieldset^[HTMLElement]|!disabled,name","font^[HTMLElement]|color,face,size","form^[HTMLElement]|acceptCharset,action,autocomplete,encoding,enctype,method,name,!noValidate,target","frame^[HTMLElement]|frameBorder,longDesc,marginHeight,marginWidth,name,!noResize,scrolling,src","frameset^[HTMLElement]|cols,*afterprint,*beforeprint,*beforeunload,*blur,*error,*focus,*hashchange,*languagechange,*load,*message,*messageerror,*offline,*online,*pagehide,*pageshow,*popstate,*rejectionhandled,*resize,*scroll,*storage,*unhandledrejection,*unload,rows","hr^[HTMLElement]|align,color,!noShade,size,width","head^[HTMLElement]|","h1,h2,h3,h4,h5,h6^[HTMLElement]|align","html^[HTMLElement]|version","iframe^[HTMLElement]|align,allow,!allowFullscreen,!allowPaymentRequest,csp,frameBorder,height,loading,longDesc,marginHeight,marginWidth,name,referrerPolicy,%sandbox,scrolling,src,srcdoc,width","img^[HTMLElement]|align,alt,border,%crossOrigin,decoding,#height,#hspace,!isMap,loading,longDesc,lowsrc,name,referrerPolicy,sizes,src,srcset,useMap,#vspace,#width","input^[HTMLElement]|accept,align,alt,autocomplete,!checked,!defaultChecked,defaultValue,dirName,!disabled,%files,formAction,formEnctype,formMethod,!formNoValidate,formTarget,#height,!incremental,!indeterminate,max,#maxLength,min,#minLength,!multiple,name,pattern,placeholder,!readOnly,!required,selectionDirection,#selectionEnd,#selectionStart,#size,src,step,type,useMap,value,%valueAsDate,#valueAsNumber,#width","li^[HTMLElement]|type,#value","label^[HTMLElement]|htmlFor","legend^[HTMLElement]|align","link^[HTMLElement]|as,charset,%crossOrigin,!disabled,href,hreflang,imageSizes,imageSrcset,integrity,media,referrerPolicy,rel,%relList,rev,%sizes,target,type","map^[HTMLElement]|name","marquee^[HTMLElement]|behavior,bgColor,direction,height,#hspace,#loop,#scrollAmount,#scrollDelay,!trueSpeed,#vspace,width","menu^[HTMLElement]|!compact","meta^[HTMLElement]|content,httpEquiv,media,name,scheme","meter^[HTMLElement]|#high,#low,#max,#min,#optimum,#value","ins,del^[HTMLElement]|cite,dateTime","ol^[HTMLElement]|!compact,!reversed,#start,type","object^[HTMLElement]|align,archive,border,code,codeBase,codeType,data,!declare,height,#hspace,name,standby,type,useMap,#vspace,width","optgroup^[HTMLElement]|!disabled,label","option^[HTMLElement]|!defaultSelected,!disabled,label,!selected,text,value","output^[HTMLElement]|defaultValue,%htmlFor,name,value","p^[HTMLElement]|align","param^[HTMLElement]|name,type,value,valueType","picture^[HTMLElement]|","pre^[HTMLElement]|#width","progress^[HTMLElement]|#max,#value","q,blockquote,cite^[HTMLElement]|","script^[HTMLElement]|!async,charset,%crossOrigin,!defer,event,htmlFor,integrity,!noModule,%referrerPolicy,src,text,type","select^[HTMLElement]|autocomplete,!disabled,#length,!multiple,name,!required,#selectedIndex,#size,value","selectedcontent^[HTMLElement]|","slot^[HTMLElement]|name","source^[HTMLElement]|#height,media,sizes,src,srcset,type,#width","span^[HTMLElement]|","style^[HTMLElement]|!disabled,media,type","search^[HTMLELement]|","caption^[HTMLElement]|align","th,td^[HTMLElement]|abbr,align,axis,bgColor,ch,chOff,#colSpan,headers,height,!noWrap,#rowSpan,scope,vAlign,width","col,colgroup^[HTMLElement]|align,ch,chOff,#span,vAlign,width","table^[HTMLElement]|align,bgColor,border,%caption,cellPadding,cellSpacing,frame,rules,summary,%tFoot,%tHead,width","tr^[HTMLElement]|align,bgColor,ch,chOff,vAlign","tfoot,thead,tbody^[HTMLElement]|align,ch,chOff,vAlign","template^[HTMLElement]|","textarea^[HTMLElement]|autocomplete,#cols,defaultValue,dirName,!disabled,#maxLength,#minLength,name,placeholder,!readOnly,!required,#rows,selectionDirection,#selectionEnd,#selectionStart,value,wrap","time^[HTMLElement]|dateTime","title^[HTMLElement]|text","track^[HTMLElement]|!default,kind,label,src,srclang","ul^[HTMLElement]|!compact,type","unknown^[HTMLElement]|","video^media|!disablePictureInPicture,#height,*enterpictureinpicture,*leavepictureinpicture,!playsInline,poster,#width",":svg:a^:svg:graphics|",":svg:animate^:svg:animation|",":svg:animateMotion^:svg:animation|",":svg:animateTransform^:svg:animation|",":svg:circle^:svg:geometry|",":svg:clipPath^:svg:graphics|",":svg:defs^:svg:graphics|",":svg:desc^:svg:|",":svg:discard^:svg:|",":svg:ellipse^:svg:geometry|",":svg:feBlend^:svg:|",":svg:feColorMatrix^:svg:|",":svg:feComponentTransfer^:svg:|",":svg:feComposite^:svg:|",":svg:feConvolveMatrix^:svg:|",":svg:feDiffuseLighting^:svg:|",":svg:feDisplacementMap^:svg:|",":svg:feDistantLight^:svg:|",":svg:feDropShadow^:svg:|",":svg:feFlood^:svg:|",":svg:feFuncA^:svg:componentTransferFunction|",":svg:feFuncB^:svg:componentTransferFunction|",":svg:feFuncG^:svg:componentTransferFunction|",":svg:feFuncR^:svg:componentTransferFunction|",":svg:feGaussianBlur^:svg:|",":svg:feImage^:svg:|",":svg:feMerge^:svg:|",":svg:feMergeNode^:svg:|",":svg:feMorphology^:svg:|",":svg:feOffset^:svg:|",":svg:fePointLight^:svg:|",":svg:feSpecularLighting^:svg:|",":svg:feSpotLight^:svg:|",":svg:feTile^:svg:|",":svg:feTurbulence^:svg:|",":svg:filter^:svg:|",":svg:foreignObject^:svg:graphics|",":svg:g^:svg:graphics|",":svg:image^:svg:graphics|decoding",":svg:line^:svg:geometry|",":svg:linearGradient^:svg:gradient|",":svg:mpath^:svg:|",":svg:marker^:svg:|",":svg:mask^:svg:|",":svg:metadata^:svg:|",":svg:path^:svg:geometry|",":svg:pattern^:svg:|",":svg:polygon^:svg:geometry|",":svg:polyline^:svg:geometry|",":svg:radialGradient^:svg:gradient|",":svg:rect^:svg:geometry|",":svg:svg^:svg:graphics|#currentScale,#zoomAndPan",":svg:script^:svg:|type",":svg:set^:svg:animation|",":svg:stop^:svg:|",":svg:style^:svg:|!disabled,media,title,type",":svg:switch^:svg:graphics|",":svg:symbol^:svg:|",":svg:tspan^:svg:textPositioning|",":svg:text^:svg:textPositioning|",":svg:textPath^:svg:textContent|",":svg:title^:svg:|",":svg:use^:svg:graphics|",":svg:view^:svg:|#zoomAndPan","data^[HTMLElement]|value","keygen^[HTMLElement]|!autofocus,challenge,!disabled,form,keytype,name","menuitem^[HTMLElement]|type,label,icon,!disabled,!checked,radiogroup,!default","summary^[HTMLElement]|","time^[HTMLElement]|dateTime",":svg:cursor^:svg:|",":math:^[HTMLElement]|!autofocus,nonce,*abort,*animationend,*animationiteration,*animationstart,*auxclick,*beforeinput,*beforematch,*beforetoggle,*beforexrselect,*blur,*cancel,*canplay,*canplaythrough,*change,*click,*close,*contentvisibilityautostatechange,*contextlost,*contextmenu,*contextrestored,*copy,*cuechange,*cut,*dblclick,*drag,*dragend,*dragenter,*dragleave,*dragover,*dragstart,*drop,*durationchange,*emptied,*ended,*error,*focus,*formdata,*gotpointercapture,*input,*invalid,*keydown,*keypress,*keyup,*load,*loadeddata,*loadedmetadata,*loadstart,*lostpointercapture,*mousedown,*mouseenter,*mouseleave,*mousemove,*mouseout,*mouseover,*mouseup,*mousewheel,*paste,*pause,*play,*playing,*pointercancel,*pointerdown,*pointerenter,*pointerleave,*pointermove,*pointerout,*pointerover,*pointerrawupdate,*pointerup,*progress,*ratechange,*reset,*resize,*scroll,*scrollend,*securitypolicyviolation,*seeked,*seeking,*select,*selectionchange,*selectstart,*slotchange,*stalled,*submit,*suspend,*timeupdate,*toggle,*transitioncancel,*transitionend,*transitionrun,*transitionstart,*volumechange,*waiting,*webkitanimationend,*webkitanimationiteration,*webkitanimationstart,*webkittransitionend,*wheel,%style,#tabIndex",":math:math^:math:|",":math:maction^:math:|",":math:menclose^:math:|",":math:merror^:math:|",":math:mfenced^:math:|",":math:mfrac^:math:|",":math:mi^:math:|",":math:mmultiscripts^:math:|",":math:mn^:math:|",":math:mo^:math:|",":math:mover^:math:|",":math:mpadded^:math:|",":math:mphantom^:math:|",":math:mroot^:math:|",":math:mrow^:math:|",":math:ms^:math:|",":math:mspace^:math:|",":math:msqrt^:math:|",":math:mstyle^:math:|",":math:msub^:math:|",":math:msubsup^:math:|",":math:msup^:math:|",":math:mtable^:math:|",":math:mtd^:math:|",":math:mtext^:math:|",":math:mtr^:math:|",":math:munder^:math:|",":math:munderover^:math:|",":math:semantics^:math:|"],Ii=new Map(Object.entries({class:"className",for:"htmlFor",formaction:"formAction",innerHtml:"innerHTML",readonly:"readOnly",tabindex:"tabIndex","aria-activedescendant":"ariaActiveDescendantElement","aria-atomic":"ariaAtomic","aria-autocomplete":"ariaAutoComplete","aria-busy":"ariaBusy","aria-checked":"ariaChecked","aria-colcount":"ariaColCount","aria-colindex":"ariaColIndex","aria-colindextext":"ariaColIndexText","aria-colspan":"ariaColSpan","aria-controls":"ariaControlsElements","aria-current":"ariaCurrent","aria-describedby":"ariaDescribedByElements","aria-description":"ariaDescription","aria-details":"ariaDetailsElements","aria-disabled":"ariaDisabled","aria-errormessage":"ariaErrorMessageElements","aria-expanded":"ariaExpanded","aria-flowto":"ariaFlowToElements","aria-haspopup":"ariaHasPopup","aria-hidden":"ariaHidden","aria-invalid":"ariaInvalid","aria-keyshortcuts":"ariaKeyShortcuts","aria-label":"ariaLabel","aria-labelledby":"ariaLabelledByElements","aria-level":"ariaLevel","aria-live":"ariaLive","aria-modal":"ariaModal","aria-multiline":"ariaMultiLine","aria-multiselectable":"ariaMultiSelectable","aria-orientation":"ariaOrientation","aria-owns":"ariaOwnsElements","aria-placeholder":"ariaPlaceholder","aria-posinset":"ariaPosInSet","aria-pressed":"ariaPressed","aria-readonly":"ariaReadOnly","aria-required":"ariaRequired","aria-roledescription":"ariaRoleDescription","aria-rowcount":"ariaRowCount","aria-rowindex":"ariaRowIndex","aria-rowindextext":"ariaRowIndexText","aria-rowspan":"ariaRowSpan","aria-selected":"ariaSelected","aria-setsize":"ariaSetSize","aria-sort":"ariaSort","aria-valuemax":"ariaValueMax","aria-valuemin":"ariaValueMin","aria-valuenow":"ariaValueNow","aria-valuetext":"ariaValueText"})),oo$1=Array.from(Ii).reduce((e,[t,r])=>(e.set(t,r),e),new Map),Ri=class extends Di$1{constructor(){super(),this._schema=new Map,this._eventSchema=new Map,ao$1.forEach(e=>{let t=new Map,r=new Set,[n,i]=e.split("|"),s=i.split(","),[a,o]=n.split("^");a.split(",").forEach(u=>{this._schema.set(u.toLowerCase(),t),this._eventSchema.set(u.toLowerCase(),r);});let c=o&&this._schema.get(o.toLowerCase());if(c){for(let[u,p]of c)t.set(u,p);for(let u of this._eventSchema.get(o.toLowerCase()))r.add(u);}s.forEach(u=>{if(u.length>0)switch(u[0]){case "*":r.add(u.substring(1));break;case "!":t.set(u.substring(1),ro$1);break;case "#":t.set(u.substring(1),no$1);break;case "%":t.set(u.substring(1),so$1);break;default:t.set(u,io$1);}});});}hasProperty(e,t,r){if(r.some(n=>n.name===xr$1.name))return  true;if(e.indexOf("-")>-1){if(br$1(e)||wr$1(e))return  false;if(r.some(n=>n.name===kr$1.name))return  true}return (this._schema.get(e.toLowerCase())||this._schema.get("unknown")).has(t)}hasElement(e,t){return t.some(r=>r.name===xr$1.name)||e.indexOf("-")>-1&&(br$1(e)||wr$1(e)||t.some(r=>r.name===kr$1.name))?true:this._schema.has(e.toLowerCase())}securityContext(e,t,r){r&&(t=this.getMappedPropName(t)),e=e.toLowerCase(),t=t.toLowerCase();let n=Ar$1()[e+"|"+t];return n||(n=Ar$1()["*|"+t],n||re.NONE)}getMappedPropName(e){return Ii.get(e)??e}getDefaultComponentElementName(){return "ng-component"}validateProperty(e){return e.toLowerCase().startsWith("on")?{error:true,msg:`Binding to event property '${e}' is disallowed for security reasons, please use (${e.slice(2)})=...
If '${e}' is a directive input, make sure the directive is imported by the current module.`}:{error:false}}validateAttribute(e){return e.toLowerCase().startsWith("on")?{error:true,msg:`Binding to event attribute '${e}' is disallowed for security reasons, please use (${e.slice(2)})=...`}:{error:false}}allKnownElementNames(){return Array.from(this._schema.keys())}allKnownAttributesOfElement(e){let t=this._schema.get(e.toLowerCase())||this._schema.get("unknown");return Array.from(t.keys()).map(r=>oo$1.get(r)??r)}allKnownEventsOfElement(e){return Array.from(this._eventSchema.get(e.toLowerCase())??[])}normalizeAnimationStyleProperty(e){return Oi(e)}normalizeAnimationStyleValue(e,t,r){let n="",i=r.toString().trim(),s=null;if(lo$1(e)&&r!==0&&r!=="0")if(typeof r=="number")n="px";else {let a=r.match(/^[+-]?[\d\.]+([a-z]*)$/);a&&a[1].length==0&&(s=`Please provide a CSS unit value for ${t}:${r}`);}return {error:s,value:i+n}}};function lo$1(e){switch(e){case "width":case "height":case "minWidth":case "minHeight":case "maxWidth":case "maxHeight":case "left":case "top":case "bottom":case "right":case "fontSize":case "outlineWidth":case "outlineOffset":case "paddingTop":case "paddingLeft":case "paddingBottom":case "paddingRight":case "marginTop":case "marginLeft":case "marginBottom":case "marginRight":case "borderRadius":case "borderWidth":case "borderTopWidth":case "borderLeftWidth":case "borderRightWidth":case "borderBottomWidth":case "textIndent":return  true;default:return  false}}var f=class{constructor({closedByChildren:e,implicitNamespacePrefix:t,contentType:r=R$1.PARSABLE_DATA,closedByParent:n=false,isVoid:i=false,ignoreFirstLf:s=false,preventNamespaceInheritance:a=false,canSelfClose:o=false}={}){this.closedByChildren={},this.closedByParent=false,e&&e.length>0&&e.forEach(c=>this.closedByChildren[c]=true),this.isVoid=i,this.closedByParent=n||i,this.implicitNamespacePrefix=t||null,this.contentType=r,this.ignoreFirstLf=s,this.preventNamespaceInheritance=a,this.canSelfClose=o??i;}isClosedByChild(e){return this.isVoid||e.toLowerCase()in this.closedByChildren}getContentType(e){return typeof this.contentType=="object"?(e===void 0?void 0:this.contentType[e])??this.contentType.default:this.contentType}},Mi,lt$1;function Be$1(e){return lt$1||(Mi=new f({canSelfClose:true}),lt$1=Object.assign(Object.create(null),{base:new f({isVoid:true}),meta:new f({isVoid:true}),area:new f({isVoid:true}),embed:new f({isVoid:true}),link:new f({isVoid:true}),img:new f({isVoid:true}),input:new f({isVoid:true}),param:new f({isVoid:true}),hr:new f({isVoid:true}),br:new f({isVoid:true}),source:new f({isVoid:true}),track:new f({isVoid:true}),wbr:new f({isVoid:true}),p:new f({closedByChildren:["address","article","aside","blockquote","div","dl","fieldset","footer","form","h1","h2","h3","h4","h5","h6","header","hgroup","hr","main","nav","ol","p","pre","section","table","ul"],closedByParent:true}),thead:new f({closedByChildren:["tbody","tfoot"]}),tbody:new f({closedByChildren:["tbody","tfoot"],closedByParent:true}),tfoot:new f({closedByChildren:["tbody"],closedByParent:true}),tr:new f({closedByChildren:["tr"],closedByParent:true}),td:new f({closedByChildren:["td","th"],closedByParent:true}),th:new f({closedByChildren:["td","th"],closedByParent:true}),col:new f({isVoid:true}),svg:new f({implicitNamespacePrefix:"svg"}),foreignObject:new f({implicitNamespacePrefix:"svg",preventNamespaceInheritance:true}),math:new f({implicitNamespacePrefix:"math"}),li:new f({closedByChildren:["li"],closedByParent:true}),dt:new f({closedByChildren:["dt","dd"]}),dd:new f({closedByChildren:["dt","dd"],closedByParent:true}),rb:new f({closedByChildren:["rb","rt","rtc","rp"],closedByParent:true}),rt:new f({closedByChildren:["rb","rt","rtc","rp"],closedByParent:true}),rtc:new f({closedByChildren:["rb","rtc","rp"],closedByParent:true}),rp:new f({closedByChildren:["rb","rt","rtc","rp"],closedByParent:true}),optgroup:new f({closedByChildren:["optgroup"],closedByParent:true}),option:new f({closedByChildren:["option","optgroup"],closedByParent:true}),pre:new f({ignoreFirstLf:true}),listing:new f({ignoreFirstLf:true}),style:new f({contentType:R$1.RAW_TEXT}),script:new f({contentType:R$1.RAW_TEXT}),title:new f({contentType:{default:R$1.ESCAPABLE_RAW_TEXT,svg:R$1.PARSABLE_DATA}}),textarea:new f({contentType:R$1.ESCAPABLE_RAW_TEXT,ignoreFirstLf:true})}),new Ri().allKnownElementNames().forEach(t=>{!lt$1[t]&&Me$1(t)===null&&(lt$1[t]=new f({canSelfClose:false}));})),lt$1[e]??Mi}function ct$1(e){return e>=9&&e<=32||e==160}function ut$1(e){return 48<=e&&e<=57}function Fe$1(e){return e>=97&&e<=122||e>=65&&e<=90}function Bi(e){return e>=97&&e<=102||e>=65&&e<=70||ut$1(e)}function pt$1(e){return e===10||e===13}function yr$1(e){return 48<=e&&e<=55}function Ut$1(e){return e===39||e===34||e===96}var qe$1=class qi{constructor(t,r,n,i){this.file=t,this.offset=r,this.line=n,this.col=i;}toString(){return this.offset!=null?`${this.file.url}@${this.line}:${this.col}`:this.file.url}moveBy(t){let r=this.file.content,n=r.length,i=this.offset,s=this.line,a=this.col;for(;i>0&&t<0;)if(i--,t++,r.charCodeAt(i)==10){s--;let o=r.substring(0,i-1).lastIndexOf(String.fromCharCode(10));a=o>0?i-o:i;}else a--;for(;i<n&&t>0;){let o=r.charCodeAt(i);i++,t--,o==10?(s++,a=0):a++;}return new qi(this.file,i,s,a)}getContext(t,r){let n=this.file.content,i=this.offset;if(i!=null){i>n.length-1&&(i=n.length-1);let s=i,a=0,o=0;for(;a<t&&i>0&&(i--,a++,!(n[i]==`
`&&++o==r)););for(a=0,o=0;a<t&&s<n.length-1&&(s++,a++,!(n[s]==`
`&&++o==r)););return {before:n.substring(i,this.offset),after:n.substring(this.offset,s+1)}}return null}},mt$1=class mt{constructor(e,t){this.content=e,this.url=t;}},h=class{constructor(e,t,r=e,n=null){this.start=e,this.end=t,this.fullStart=r,this.details=n;}toString(){return this.start.file.content.substring(this.start.offset,this.end.offset)}},Fi=(function(e){return e[e.WARNING=0]="WARNING",e[e.ERROR=1]="ERROR",e})({}),ne=class extends Error{constructor(e,t,r=Fi.ERROR,n){super(t),this.span=e,this.msg=t,this.level=r,this.relatedError=n,Object.setPrototypeOf(this,new.target.prototype);}contextualMessage(){let e=this.span.start.getContext(100,3);return e?`${this.msg} ("${e.before}[${Fi[this.level]} ->]${e.after}")`:this.msg}toString(){let e=this.span.details?`, ${this.span.details}`:"";return `${this.contextualMessage()}: ${this.span.start}${e}`}};var Ce$1=class Ce{constructor(e,t){this.sourceSpan=e,this.i18n=t;}},Hi=class extends Ce$1{constructor(e,t,r,n){super(t,n),this.value=e,this.tokens=r,this.kind="text";}visit(e,t){return e.visitText(this,t)}},Vi=class extends Ce$1{constructor(e,t,r,n){super(t,n),this.value=e,this.tokens=r,this.kind="cdata";}visit(e,t){return e.visitCdata(this,t)}},Ui=class extends Ce$1{constructor(e,t,r,n,i,s){super(n,s),this.switchValue=e,this.type=t,this.cases=r,this.switchValueSourceSpan=i,this.kind="expansion";}visit(e,t){return e.visitExpansion(this,t)}},Wi=class{constructor(e,t,r,n,i){this.value=e,this.expression=t,this.sourceSpan=r,this.valueSourceSpan=n,this.expSourceSpan=i,this.kind="expansionCase";}visit(e,t){return e.visitExpansionCase(this,t)}},Gi=class extends Ce$1{constructor(e,t,r,n,i,s,a){super(r,a),this.name=e,this.value=t,this.keySpan=n,this.valueSpan=i,this.valueTokens=s,this.kind="attribute";}visit(e,t){return e.visitAttribute(this,t)}get nameSpan(){return this.keySpan}},ie$1=class ie extends Ce$1{constructor(e,t,r,n,i,s,a,o=null,c=null,u,p){super(s,p),this.name=e,this.attrs=t,this.directives=r,this.children=n,this.isSelfClosing=i,this.startSourceSpan=a,this.endSourceSpan=o,this.nameSpan=c,this.isVoid=u,this.kind="element";}visit(e,t){return e.visitElement(this,t)}},$i=class{constructor(e,t){this.value=e,this.sourceSpan=t,this.kind="comment";}visit(e,t){return e.visitComment(this,t)}},zi=class{constructor(e,t){this.value=e,this.sourceSpan=t,this.kind="docType";}visit(e,t){return e.visitDocType(this,t)}},ve$1=class ve extends Ce$1{constructor(e,t,r,n,i,s,a=null,o){super(n,o),this.name=e,this.parameters=t,this.children=r,this.nameSpan=i,this.startSourceSpan=s,this.endSourceSpan=a,this.kind="block";}visit(e,t){return e.visitBlock(this,t)}},J=class extends Ce$1{constructor(e,t,r,n,i,s,a,o,c,u=null,p){super(o,p),this.componentName=e,this.tagName=t,this.fullName=r,this.attrs=n,this.directives=i,this.children=s,this.isSelfClosing=a,this.startSourceSpan=c,this.endSourceSpan=u,this.kind="component";}visit(e,t){return e.visitComponent(this,t)}},Yi=class{constructor(e,t,r,n,i=null){this.name=e,this.attrs=t,this.sourceSpan=r,this.startSourceSpan=n,this.endSourceSpan=i,this.kind="directive";}visit(e,t){return e.visitDirective(this,t)}},Nr=class{constructor(e,t){this.expression=e,this.sourceSpan=t,this.kind="blockParameter",this.startSourceSpan=null,this.endSourceSpan=null;}visit(e,t){return e.visitBlockParameter(this,t)}},Lr$1=class Lr{constructor(e,t,r,n,i){this.name=e,this.value=t,this.sourceSpan=r,this.nameSpan=n,this.valueSpan=i,this.kind="letDeclaration",this.startSourceSpan=null,this.endSourceSpan=null;}visit(e,t){return e.visitLetDeclaration(this,t)}};function Wt$1(e,t,r=null){let n=[],i=e.visit?s=>e.visit(s,r)||s.visit(e,r):s=>s.visit(e,r);return t.forEach(s=>{let a=i(s);a&&n.push(a);}),n}var Pr$1=class Pr{constructor(){}visitElement(e,t){this.visitChildren(t,r=>{r(e.attrs),r(e.directives),r(e.children);});}visitAttribute(e,t){}visitText(e,t){}visitCdata(e,t){}visitComment(e,t){}visitDocType(e,t){}visitExpansion(e,t){return this.visitChildren(t,r=>{r(e.cases);})}visitExpansionCase(e,t){}visitBlock(e,t){this.visitChildren(t,r=>{r(e.parameters),r(e.children);});}visitBlockParameter(e,t){}visitLetDeclaration(e,t){}visitComponent(e,t){this.visitChildren(t,r=>{r(e.attrs),r(e.children);});}visitDirective(e,t){this.visitChildren(t,r=>{r(e.attrs);});}visitChildren(e,t){let r=[],n=this;function i(s){s&&r.push(Wt$1(n,s,e));}return t(i),Array.prototype.concat.apply([],r)}};var Te={AElig:"\xC6",AMP:"&",amp:"&",Aacute:"\xC1",Abreve:"\u0102",Acirc:"\xC2",Acy:"\u0410",Afr:"\u{1D504}",Agrave:"\xC0",Alpha:"\u0391",Amacr:"\u0100",And:"\u2A53",Aogon:"\u0104",Aopf:"\u{1D538}",ApplyFunction:"\u2061",af:"\u2061",Aring:"\xC5",angst:"\xC5",Ascr:"\u{1D49C}",Assign:"\u2254",colone:"\u2254",coloneq:"\u2254",Atilde:"\xC3",Auml:"\xC4",Backslash:"\u2216",setminus:"\u2216",setmn:"\u2216",smallsetminus:"\u2216",ssetmn:"\u2216",Barv:"\u2AE7",Barwed:"\u2306",doublebarwedge:"\u2306",Bcy:"\u0411",Because:"\u2235",becaus:"\u2235",because:"\u2235",Bernoullis:"\u212C",Bscr:"\u212C",bernou:"\u212C",Beta:"\u0392",Bfr:"\u{1D505}",Bopf:"\u{1D539}",Breve:"\u02D8",breve:"\u02D8",Bumpeq:"\u224E",HumpDownHump:"\u224E",bump:"\u224E",CHcy:"\u0427",COPY:"\xA9",copy:"\xA9",Cacute:"\u0106",Cap:"\u22D2",CapitalDifferentialD:"\u2145",DD:"\u2145",Cayleys:"\u212D",Cfr:"\u212D",Ccaron:"\u010C",Ccedil:"\xC7",Ccirc:"\u0108",Cconint:"\u2230",Cdot:"\u010A",Cedilla:"\xB8",cedil:"\xB8",CenterDot:"\xB7",centerdot:"\xB7",middot:"\xB7",Chi:"\u03A7",CircleDot:"\u2299",odot:"\u2299",CircleMinus:"\u2296",ominus:"\u2296",CirclePlus:"\u2295",oplus:"\u2295",CircleTimes:"\u2297",otimes:"\u2297",ClockwiseContourIntegral:"\u2232",cwconint:"\u2232",CloseCurlyDoubleQuote:"\u201D",rdquo:"\u201D",rdquor:"\u201D",CloseCurlyQuote:"\u2019",rsquo:"\u2019",rsquor:"\u2019",Colon:"\u2237",Proportion:"\u2237",Colone:"\u2A74",Congruent:"\u2261",equiv:"\u2261",Conint:"\u222F",DoubleContourIntegral:"\u222F",ContourIntegral:"\u222E",conint:"\u222E",oint:"\u222E",Copf:"\u2102",complexes:"\u2102",Coproduct:"\u2210",coprod:"\u2210",CounterClockwiseContourIntegral:"\u2233",awconint:"\u2233",Cross:"\u2A2F",Cscr:"\u{1D49E}",Cup:"\u22D3",CupCap:"\u224D",asympeq:"\u224D",DDotrahd:"\u2911",DJcy:"\u0402",DScy:"\u0405",DZcy:"\u040F",Dagger:"\u2021",ddagger:"\u2021",Darr:"\u21A1",Dashv:"\u2AE4",DoubleLeftTee:"\u2AE4",Dcaron:"\u010E",Dcy:"\u0414",Del:"\u2207",nabla:"\u2207",Delta:"\u0394",Dfr:"\u{1D507}",DiacriticalAcute:"\xB4",acute:"\xB4",DiacriticalDot:"\u02D9",dot:"\u02D9",DiacriticalDoubleAcute:"\u02DD",dblac:"\u02DD",DiacriticalGrave:"`",grave:"`",DiacriticalTilde:"\u02DC",tilde:"\u02DC",Diamond:"\u22C4",diam:"\u22C4",diamond:"\u22C4",DifferentialD:"\u2146",dd:"\u2146",Dopf:"\u{1D53B}",Dot:"\xA8",DoubleDot:"\xA8",die:"\xA8",uml:"\xA8",DotDot:"\u20DC",DotEqual:"\u2250",doteq:"\u2250",esdot:"\u2250",DoubleDownArrow:"\u21D3",Downarrow:"\u21D3",dArr:"\u21D3",DoubleLeftArrow:"\u21D0",Leftarrow:"\u21D0",lArr:"\u21D0",DoubleLeftRightArrow:"\u21D4",Leftrightarrow:"\u21D4",hArr:"\u21D4",iff:"\u21D4",DoubleLongLeftArrow:"\u27F8",Longleftarrow:"\u27F8",xlArr:"\u27F8",DoubleLongLeftRightArrow:"\u27FA",Longleftrightarrow:"\u27FA",xhArr:"\u27FA",DoubleLongRightArrow:"\u27F9",Longrightarrow:"\u27F9",xrArr:"\u27F9",DoubleRightArrow:"\u21D2",Implies:"\u21D2",Rightarrow:"\u21D2",rArr:"\u21D2",DoubleRightTee:"\u22A8",vDash:"\u22A8",DoubleUpArrow:"\u21D1",Uparrow:"\u21D1",uArr:"\u21D1",DoubleUpDownArrow:"\u21D5",Updownarrow:"\u21D5",vArr:"\u21D5",DoubleVerticalBar:"\u2225",par:"\u2225",parallel:"\u2225",shortparallel:"\u2225",spar:"\u2225",DownArrow:"\u2193",ShortDownArrow:"\u2193",darr:"\u2193",downarrow:"\u2193",DownArrowBar:"\u2913",DownArrowUpArrow:"\u21F5",duarr:"\u21F5",DownBreve:"\u0311",DownLeftRightVector:"\u2950",DownLeftTeeVector:"\u295E",DownLeftVector:"\u21BD",leftharpoondown:"\u21BD",lhard:"\u21BD",DownLeftVectorBar:"\u2956",DownRightTeeVector:"\u295F",DownRightVector:"\u21C1",rhard:"\u21C1",rightharpoondown:"\u21C1",DownRightVectorBar:"\u2957",DownTee:"\u22A4",top:"\u22A4",DownTeeArrow:"\u21A7",mapstodown:"\u21A7",Dscr:"\u{1D49F}",Dstrok:"\u0110",ENG:"\u014A",ETH:"\xD0",Eacute:"\xC9",Ecaron:"\u011A",Ecirc:"\xCA",Ecy:"\u042D",Edot:"\u0116",Efr:"\u{1D508}",Egrave:"\xC8",Element:"\u2208",in:"\u2208",isin:"\u2208",isinv:"\u2208",Emacr:"\u0112",EmptySmallSquare:"\u25FB",EmptyVerySmallSquare:"\u25AB",Eogon:"\u0118",Eopf:"\u{1D53C}",Epsilon:"\u0395",Equal:"\u2A75",EqualTilde:"\u2242",eqsim:"\u2242",esim:"\u2242",Equilibrium:"\u21CC",rightleftharpoons:"\u21CC",rlhar:"\u21CC",Escr:"\u2130",expectation:"\u2130",Esim:"\u2A73",Eta:"\u0397",Euml:"\xCB",Exists:"\u2203",exist:"\u2203",ExponentialE:"\u2147",ee:"\u2147",exponentiale:"\u2147",Fcy:"\u0424",Ffr:"\u{1D509}",FilledSmallSquare:"\u25FC",FilledVerySmallSquare:"\u25AA",blacksquare:"\u25AA",squarf:"\u25AA",squf:"\u25AA",Fopf:"\u{1D53D}",ForAll:"\u2200",forall:"\u2200",Fouriertrf:"\u2131",Fscr:"\u2131",GJcy:"\u0403",GT:">",gt:">",Gamma:"\u0393",Gammad:"\u03DC",Gbreve:"\u011E",Gcedil:"\u0122",Gcirc:"\u011C",Gcy:"\u0413",Gdot:"\u0120",Gfr:"\u{1D50A}",Gg:"\u22D9",ggg:"\u22D9",Gopf:"\u{1D53E}",GreaterEqual:"\u2265",ge:"\u2265",geq:"\u2265",GreaterEqualLess:"\u22DB",gel:"\u22DB",gtreqless:"\u22DB",GreaterFullEqual:"\u2267",gE:"\u2267",geqq:"\u2267",GreaterGreater:"\u2AA2",GreaterLess:"\u2277",gl:"\u2277",gtrless:"\u2277",GreaterSlantEqual:"\u2A7E",geqslant:"\u2A7E",ges:"\u2A7E",GreaterTilde:"\u2273",gsim:"\u2273",gtrsim:"\u2273",Gscr:"\u{1D4A2}",Gt:"\u226B",NestedGreaterGreater:"\u226B",gg:"\u226B",HARDcy:"\u042A",Hacek:"\u02C7",caron:"\u02C7",Hat:"^",Hcirc:"\u0124",Hfr:"\u210C",Poincareplane:"\u210C",HilbertSpace:"\u210B",Hscr:"\u210B",hamilt:"\u210B",Hopf:"\u210D",quaternions:"\u210D",HorizontalLine:"\u2500",boxh:"\u2500",Hstrok:"\u0126",HumpEqual:"\u224F",bumpe:"\u224F",bumpeq:"\u224F",IEcy:"\u0415",IJlig:"\u0132",IOcy:"\u0401",Iacute:"\xCD",Icirc:"\xCE",Icy:"\u0418",Idot:"\u0130",Ifr:"\u2111",Im:"\u2111",image:"\u2111",imagpart:"\u2111",Igrave:"\xCC",Imacr:"\u012A",ImaginaryI:"\u2148",ii:"\u2148",Int:"\u222C",Integral:"\u222B",int:"\u222B",Intersection:"\u22C2",bigcap:"\u22C2",xcap:"\u22C2",InvisibleComma:"\u2063",ic:"\u2063",InvisibleTimes:"\u2062",it:"\u2062",Iogon:"\u012E",Iopf:"\u{1D540}",Iota:"\u0399",Iscr:"\u2110",imagline:"\u2110",Itilde:"\u0128",Iukcy:"\u0406",Iuml:"\xCF",Jcirc:"\u0134",Jcy:"\u0419",Jfr:"\u{1D50D}",Jopf:"\u{1D541}",Jscr:"\u{1D4A5}",Jsercy:"\u0408",Jukcy:"\u0404",KHcy:"\u0425",KJcy:"\u040C",Kappa:"\u039A",Kcedil:"\u0136",Kcy:"\u041A",Kfr:"\u{1D50E}",Kopf:"\u{1D542}",Kscr:"\u{1D4A6}",LJcy:"\u0409",LT:"<",lt:"<",Lacute:"\u0139",Lambda:"\u039B",Lang:"\u27EA",Laplacetrf:"\u2112",Lscr:"\u2112",lagran:"\u2112",Larr:"\u219E",twoheadleftarrow:"\u219E",Lcaron:"\u013D",Lcedil:"\u013B",Lcy:"\u041B",LeftAngleBracket:"\u27E8",lang:"\u27E8",langle:"\u27E8",LeftArrow:"\u2190",ShortLeftArrow:"\u2190",larr:"\u2190",leftarrow:"\u2190",slarr:"\u2190",LeftArrowBar:"\u21E4",larrb:"\u21E4",LeftArrowRightArrow:"\u21C6",leftrightarrows:"\u21C6",lrarr:"\u21C6",LeftCeiling:"\u2308",lceil:"\u2308",LeftDoubleBracket:"\u27E6",lobrk:"\u27E6",LeftDownTeeVector:"\u2961",LeftDownVector:"\u21C3",dharl:"\u21C3",downharpoonleft:"\u21C3",LeftDownVectorBar:"\u2959",LeftFloor:"\u230A",lfloor:"\u230A",LeftRightArrow:"\u2194",harr:"\u2194",leftrightarrow:"\u2194",LeftRightVector:"\u294E",LeftTee:"\u22A3",dashv:"\u22A3",LeftTeeArrow:"\u21A4",mapstoleft:"\u21A4",LeftTeeVector:"\u295A",LeftTriangle:"\u22B2",vartriangleleft:"\u22B2",vltri:"\u22B2",LeftTriangleBar:"\u29CF",LeftTriangleEqual:"\u22B4",ltrie:"\u22B4",trianglelefteq:"\u22B4",LeftUpDownVector:"\u2951",LeftUpTeeVector:"\u2960",LeftUpVector:"\u21BF",uharl:"\u21BF",upharpoonleft:"\u21BF",LeftUpVectorBar:"\u2958",LeftVector:"\u21BC",leftharpoonup:"\u21BC",lharu:"\u21BC",LeftVectorBar:"\u2952",LessEqualGreater:"\u22DA",leg:"\u22DA",lesseqgtr:"\u22DA",LessFullEqual:"\u2266",lE:"\u2266",leqq:"\u2266",LessGreater:"\u2276",lessgtr:"\u2276",lg:"\u2276",LessLess:"\u2AA1",LessSlantEqual:"\u2A7D",leqslant:"\u2A7D",les:"\u2A7D",LessTilde:"\u2272",lesssim:"\u2272",lsim:"\u2272",Lfr:"\u{1D50F}",Ll:"\u22D8",Lleftarrow:"\u21DA",lAarr:"\u21DA",Lmidot:"\u013F",LongLeftArrow:"\u27F5",longleftarrow:"\u27F5",xlarr:"\u27F5",LongLeftRightArrow:"\u27F7",longleftrightarrow:"\u27F7",xharr:"\u27F7",LongRightArrow:"\u27F6",longrightarrow:"\u27F6",xrarr:"\u27F6",Lopf:"\u{1D543}",LowerLeftArrow:"\u2199",swarr:"\u2199",swarrow:"\u2199",LowerRightArrow:"\u2198",searr:"\u2198",searrow:"\u2198",Lsh:"\u21B0",lsh:"\u21B0",Lstrok:"\u0141",Lt:"\u226A",NestedLessLess:"\u226A",ll:"\u226A",Map:"\u2905",Mcy:"\u041C",MediumSpace:"\u205F",Mellintrf:"\u2133",Mscr:"\u2133",phmmat:"\u2133",Mfr:"\u{1D510}",MinusPlus:"\u2213",mnplus:"\u2213",mp:"\u2213",Mopf:"\u{1D544}",Mu:"\u039C",NJcy:"\u040A",Nacute:"\u0143",Ncaron:"\u0147",Ncedil:"\u0145",Ncy:"\u041D",NegativeMediumSpace:"\u200B",NegativeThickSpace:"\u200B",NegativeThinSpace:"\u200B",NegativeVeryThinSpace:"\u200B",ZeroWidthSpace:"\u200B",NewLine:`
`,Nfr:"\u{1D511}",NoBreak:"\u2060",NonBreakingSpace:"\xA0",nbsp:"\xA0",Nopf:"\u2115",naturals:"\u2115",Not:"\u2AEC",NotCongruent:"\u2262",nequiv:"\u2262",NotCupCap:"\u226D",NotDoubleVerticalBar:"\u2226",npar:"\u2226",nparallel:"\u2226",nshortparallel:"\u2226",nspar:"\u2226",NotElement:"\u2209",notin:"\u2209",notinva:"\u2209",NotEqual:"\u2260",ne:"\u2260",NotEqualTilde:"\u2242\u0338",nesim:"\u2242\u0338",NotExists:"\u2204",nexist:"\u2204",nexists:"\u2204",NotGreater:"\u226F",ngt:"\u226F",ngtr:"\u226F",NotGreaterEqual:"\u2271",nge:"\u2271",ngeq:"\u2271",NotGreaterFullEqual:"\u2267\u0338",ngE:"\u2267\u0338",ngeqq:"\u2267\u0338",NotGreaterGreater:"\u226B\u0338",nGtv:"\u226B\u0338",NotGreaterLess:"\u2279",ntgl:"\u2279",NotGreaterSlantEqual:"\u2A7E\u0338",ngeqslant:"\u2A7E\u0338",nges:"\u2A7E\u0338",NotGreaterTilde:"\u2275",ngsim:"\u2275",NotHumpDownHump:"\u224E\u0338",nbump:"\u224E\u0338",NotHumpEqual:"\u224F\u0338",nbumpe:"\u224F\u0338",NotLeftTriangle:"\u22EA",nltri:"\u22EA",ntriangleleft:"\u22EA",NotLeftTriangleBar:"\u29CF\u0338",NotLeftTriangleEqual:"\u22EC",nltrie:"\u22EC",ntrianglelefteq:"\u22EC",NotLess:"\u226E",nless:"\u226E",nlt:"\u226E",NotLessEqual:"\u2270",nle:"\u2270",nleq:"\u2270",NotLessGreater:"\u2278",ntlg:"\u2278",NotLessLess:"\u226A\u0338",nLtv:"\u226A\u0338",NotLessSlantEqual:"\u2A7D\u0338",nleqslant:"\u2A7D\u0338",nles:"\u2A7D\u0338",NotLessTilde:"\u2274",nlsim:"\u2274",NotNestedGreaterGreater:"\u2AA2\u0338",NotNestedLessLess:"\u2AA1\u0338",NotPrecedes:"\u2280",npr:"\u2280",nprec:"\u2280",NotPrecedesEqual:"\u2AAF\u0338",npre:"\u2AAF\u0338",npreceq:"\u2AAF\u0338",NotPrecedesSlantEqual:"\u22E0",nprcue:"\u22E0",NotReverseElement:"\u220C",notni:"\u220C",notniva:"\u220C",NotRightTriangle:"\u22EB",nrtri:"\u22EB",ntriangleright:"\u22EB",NotRightTriangleBar:"\u29D0\u0338",NotRightTriangleEqual:"\u22ED",nrtrie:"\u22ED",ntrianglerighteq:"\u22ED",NotSquareSubset:"\u228F\u0338",NotSquareSubsetEqual:"\u22E2",nsqsube:"\u22E2",NotSquareSuperset:"\u2290\u0338",NotSquareSupersetEqual:"\u22E3",nsqsupe:"\u22E3",NotSubset:"\u2282\u20D2",nsubset:"\u2282\u20D2",vnsub:"\u2282\u20D2",NotSubsetEqual:"\u2288",nsube:"\u2288",nsubseteq:"\u2288",NotSucceeds:"\u2281",nsc:"\u2281",nsucc:"\u2281",NotSucceedsEqual:"\u2AB0\u0338",nsce:"\u2AB0\u0338",nsucceq:"\u2AB0\u0338",NotSucceedsSlantEqual:"\u22E1",nsccue:"\u22E1",NotSucceedsTilde:"\u227F\u0338",NotSuperset:"\u2283\u20D2",nsupset:"\u2283\u20D2",vnsup:"\u2283\u20D2",NotSupersetEqual:"\u2289",nsupe:"\u2289",nsupseteq:"\u2289",NotTilde:"\u2241",nsim:"\u2241",NotTildeEqual:"\u2244",nsime:"\u2244",nsimeq:"\u2244",NotTildeFullEqual:"\u2247",ncong:"\u2247",NotTildeTilde:"\u2249",nap:"\u2249",napprox:"\u2249",NotVerticalBar:"\u2224",nmid:"\u2224",nshortmid:"\u2224",nsmid:"\u2224",Nscr:"\u{1D4A9}",Ntilde:"\xD1",Nu:"\u039D",OElig:"\u0152",Oacute:"\xD3",Ocirc:"\xD4",Ocy:"\u041E",Odblac:"\u0150",Ofr:"\u{1D512}",Ograve:"\xD2",Omacr:"\u014C",Omega:"\u03A9",ohm:"\u03A9",Omicron:"\u039F",Oopf:"\u{1D546}",OpenCurlyDoubleQuote:"\u201C",ldquo:"\u201C",OpenCurlyQuote:"\u2018",lsquo:"\u2018",Or:"\u2A54",Oscr:"\u{1D4AA}",Oslash:"\xD8",Otilde:"\xD5",Otimes:"\u2A37",Ouml:"\xD6",OverBar:"\u203E",oline:"\u203E",OverBrace:"\u23DE",OverBracket:"\u23B4",tbrk:"\u23B4",OverParenthesis:"\u23DC",PartialD:"\u2202",part:"\u2202",Pcy:"\u041F",Pfr:"\u{1D513}",Phi:"\u03A6",Pi:"\u03A0",PlusMinus:"\xB1",plusmn:"\xB1",pm:"\xB1",Popf:"\u2119",primes:"\u2119",Pr:"\u2ABB",Precedes:"\u227A",pr:"\u227A",prec:"\u227A",PrecedesEqual:"\u2AAF",pre:"\u2AAF",preceq:"\u2AAF",PrecedesSlantEqual:"\u227C",prcue:"\u227C",preccurlyeq:"\u227C",PrecedesTilde:"\u227E",precsim:"\u227E",prsim:"\u227E",Prime:"\u2033",Product:"\u220F",prod:"\u220F",Proportional:"\u221D",prop:"\u221D",propto:"\u221D",varpropto:"\u221D",vprop:"\u221D",Pscr:"\u{1D4AB}",Psi:"\u03A8",QUOT:'"',quot:'"',Qfr:"\u{1D514}",Qopf:"\u211A",rationals:"\u211A",Qscr:"\u{1D4AC}",RBarr:"\u2910",drbkarow:"\u2910",REG:"\xAE",circledR:"\xAE",reg:"\xAE",Racute:"\u0154",Rang:"\u27EB",Rarr:"\u21A0",twoheadrightarrow:"\u21A0",Rarrtl:"\u2916",Rcaron:"\u0158",Rcedil:"\u0156",Rcy:"\u0420",Re:"\u211C",Rfr:"\u211C",real:"\u211C",realpart:"\u211C",ReverseElement:"\u220B",SuchThat:"\u220B",ni:"\u220B",niv:"\u220B",ReverseEquilibrium:"\u21CB",leftrightharpoons:"\u21CB",lrhar:"\u21CB",ReverseUpEquilibrium:"\u296F",duhar:"\u296F",Rho:"\u03A1",RightAngleBracket:"\u27E9",rang:"\u27E9",rangle:"\u27E9",RightArrow:"\u2192",ShortRightArrow:"\u2192",rarr:"\u2192",rightarrow:"\u2192",srarr:"\u2192",RightArrowBar:"\u21E5",rarrb:"\u21E5",RightArrowLeftArrow:"\u21C4",rightleftarrows:"\u21C4",rlarr:"\u21C4",RightCeiling:"\u2309",rceil:"\u2309",RightDoubleBracket:"\u27E7",robrk:"\u27E7",RightDownTeeVector:"\u295D",RightDownVector:"\u21C2",dharr:"\u21C2",downharpoonright:"\u21C2",RightDownVectorBar:"\u2955",RightFloor:"\u230B",rfloor:"\u230B",RightTee:"\u22A2",vdash:"\u22A2",RightTeeArrow:"\u21A6",map:"\u21A6",mapsto:"\u21A6",RightTeeVector:"\u295B",RightTriangle:"\u22B3",vartriangleright:"\u22B3",vrtri:"\u22B3",RightTriangleBar:"\u29D0",RightTriangleEqual:"\u22B5",rtrie:"\u22B5",trianglerighteq:"\u22B5",RightUpDownVector:"\u294F",RightUpTeeVector:"\u295C",RightUpVector:"\u21BE",uharr:"\u21BE",upharpoonright:"\u21BE",RightUpVectorBar:"\u2954",RightVector:"\u21C0",rharu:"\u21C0",rightharpoonup:"\u21C0",RightVectorBar:"\u2953",Ropf:"\u211D",reals:"\u211D",RoundImplies:"\u2970",Rrightarrow:"\u21DB",rAarr:"\u21DB",Rscr:"\u211B",realine:"\u211B",Rsh:"\u21B1",rsh:"\u21B1",RuleDelayed:"\u29F4",SHCHcy:"\u0429",SHcy:"\u0428",SOFTcy:"\u042C",Sacute:"\u015A",Sc:"\u2ABC",Scaron:"\u0160",Scedil:"\u015E",Scirc:"\u015C",Scy:"\u0421",Sfr:"\u{1D516}",ShortUpArrow:"\u2191",UpArrow:"\u2191",uarr:"\u2191",uparrow:"\u2191",Sigma:"\u03A3",SmallCircle:"\u2218",compfn:"\u2218",Sopf:"\u{1D54A}",Sqrt:"\u221A",radic:"\u221A",Square:"\u25A1",squ:"\u25A1",square:"\u25A1",SquareIntersection:"\u2293",sqcap:"\u2293",SquareSubset:"\u228F",sqsub:"\u228F",sqsubset:"\u228F",SquareSubsetEqual:"\u2291",sqsube:"\u2291",sqsubseteq:"\u2291",SquareSuperset:"\u2290",sqsup:"\u2290",sqsupset:"\u2290",SquareSupersetEqual:"\u2292",sqsupe:"\u2292",sqsupseteq:"\u2292",SquareUnion:"\u2294",sqcup:"\u2294",Sscr:"\u{1D4AE}",Star:"\u22C6",sstarf:"\u22C6",Sub:"\u22D0",Subset:"\u22D0",SubsetEqual:"\u2286",sube:"\u2286",subseteq:"\u2286",Succeeds:"\u227B",sc:"\u227B",succ:"\u227B",SucceedsEqual:"\u2AB0",sce:"\u2AB0",succeq:"\u2AB0",SucceedsSlantEqual:"\u227D",sccue:"\u227D",succcurlyeq:"\u227D",SucceedsTilde:"\u227F",scsim:"\u227F",succsim:"\u227F",Sum:"\u2211",sum:"\u2211",Sup:"\u22D1",Supset:"\u22D1",Superset:"\u2283",sup:"\u2283",supset:"\u2283",SupersetEqual:"\u2287",supe:"\u2287",supseteq:"\u2287",THORN:"\xDE",TRADE:"\u2122",trade:"\u2122",TSHcy:"\u040B",TScy:"\u0426",Tab:"	",Tau:"\u03A4",Tcaron:"\u0164",Tcedil:"\u0162",Tcy:"\u0422",Tfr:"\u{1D517}",Therefore:"\u2234",there4:"\u2234",therefore:"\u2234",Theta:"\u0398",ThickSpace:"\u205F\u200A",ThinSpace:"\u2009",thinsp:"\u2009",Tilde:"\u223C",sim:"\u223C",thicksim:"\u223C",thksim:"\u223C",TildeEqual:"\u2243",sime:"\u2243",simeq:"\u2243",TildeFullEqual:"\u2245",cong:"\u2245",TildeTilde:"\u2248",ap:"\u2248",approx:"\u2248",asymp:"\u2248",thickapprox:"\u2248",thkap:"\u2248",Topf:"\u{1D54B}",TripleDot:"\u20DB",tdot:"\u20DB",Tscr:"\u{1D4AF}",Tstrok:"\u0166",Uacute:"\xDA",Uarr:"\u219F",Uarrocir:"\u2949",Ubrcy:"\u040E",Ubreve:"\u016C",Ucirc:"\xDB",Ucy:"\u0423",Udblac:"\u0170",Ufr:"\u{1D518}",Ugrave:"\xD9",Umacr:"\u016A",UnderBar:"_",lowbar:"_",UnderBrace:"\u23DF",UnderBracket:"\u23B5",bbrk:"\u23B5",UnderParenthesis:"\u23DD",Union:"\u22C3",bigcup:"\u22C3",xcup:"\u22C3",UnionPlus:"\u228E",uplus:"\u228E",Uogon:"\u0172",Uopf:"\u{1D54C}",UpArrowBar:"\u2912",UpArrowDownArrow:"\u21C5",udarr:"\u21C5",UpDownArrow:"\u2195",updownarrow:"\u2195",varr:"\u2195",UpEquilibrium:"\u296E",udhar:"\u296E",UpTee:"\u22A5",bot:"\u22A5",bottom:"\u22A5",perp:"\u22A5",UpTeeArrow:"\u21A5",mapstoup:"\u21A5",UpperLeftArrow:"\u2196",nwarr:"\u2196",nwarrow:"\u2196",UpperRightArrow:"\u2197",nearr:"\u2197",nearrow:"\u2197",Upsi:"\u03D2",upsih:"\u03D2",Upsilon:"\u03A5",Uring:"\u016E",Uscr:"\u{1D4B0}",Utilde:"\u0168",Uuml:"\xDC",VDash:"\u22AB",Vbar:"\u2AEB",Vcy:"\u0412",Vdash:"\u22A9",Vdashl:"\u2AE6",Vee:"\u22C1",bigvee:"\u22C1",xvee:"\u22C1",Verbar:"\u2016",Vert:"\u2016",VerticalBar:"\u2223",mid:"\u2223",shortmid:"\u2223",smid:"\u2223",VerticalLine:"|",verbar:"|",vert:"|",VerticalSeparator:"\u2758",VerticalTilde:"\u2240",wr:"\u2240",wreath:"\u2240",VeryThinSpace:"\u200A",hairsp:"\u200A",Vfr:"\u{1D519}",Vopf:"\u{1D54D}",Vscr:"\u{1D4B1}",Vvdash:"\u22AA",Wcirc:"\u0174",Wedge:"\u22C0",bigwedge:"\u22C0",xwedge:"\u22C0",Wfr:"\u{1D51A}",Wopf:"\u{1D54E}",Wscr:"\u{1D4B2}",Xfr:"\u{1D51B}",Xi:"\u039E",Xopf:"\u{1D54F}",Xscr:"\u{1D4B3}",YAcy:"\u042F",YIcy:"\u0407",YUcy:"\u042E",Yacute:"\xDD",Ycirc:"\u0176",Ycy:"\u042B",Yfr:"\u{1D51C}",Yopf:"\u{1D550}",Yscr:"\u{1D4B4}",Yuml:"\u0178",ZHcy:"\u0416",Zacute:"\u0179",Zcaron:"\u017D",Zcy:"\u0417",Zdot:"\u017B",Zeta:"\u0396",Zfr:"\u2128",zeetrf:"\u2128",Zopf:"\u2124",integers:"\u2124",Zscr:"\u{1D4B5}",aacute:"\xE1",abreve:"\u0103",ac:"\u223E",mstpos:"\u223E",acE:"\u223E\u0333",acd:"\u223F",acirc:"\xE2",acy:"\u0430",aelig:"\xE6",afr:"\u{1D51E}",agrave:"\xE0",alefsym:"\u2135",aleph:"\u2135",alpha:"\u03B1",amacr:"\u0101",amalg:"\u2A3F",and:"\u2227",wedge:"\u2227",andand:"\u2A55",andd:"\u2A5C",andslope:"\u2A58",andv:"\u2A5A",ang:"\u2220",angle:"\u2220",ange:"\u29A4",angmsd:"\u2221",measuredangle:"\u2221",angmsdaa:"\u29A8",angmsdab:"\u29A9",angmsdac:"\u29AA",angmsdad:"\u29AB",angmsdae:"\u29AC",angmsdaf:"\u29AD",angmsdag:"\u29AE",angmsdah:"\u29AF",angrt:"\u221F",angrtvb:"\u22BE",angrtvbd:"\u299D",angsph:"\u2222",angzarr:"\u237C",aogon:"\u0105",aopf:"\u{1D552}",apE:"\u2A70",apacir:"\u2A6F",ape:"\u224A",approxeq:"\u224A",apid:"\u224B",apos:"'",aring:"\xE5",ascr:"\u{1D4B6}",ast:"*",midast:"*",atilde:"\xE3",auml:"\xE4",awint:"\u2A11",bNot:"\u2AED",backcong:"\u224C",bcong:"\u224C",backepsilon:"\u03F6",bepsi:"\u03F6",backprime:"\u2035",bprime:"\u2035",backsim:"\u223D",bsim:"\u223D",backsimeq:"\u22CD",bsime:"\u22CD",barvee:"\u22BD",barwed:"\u2305",barwedge:"\u2305",bbrktbrk:"\u23B6",bcy:"\u0431",bdquo:"\u201E",ldquor:"\u201E",bemptyv:"\u29B0",beta:"\u03B2",beth:"\u2136",between:"\u226C",twixt:"\u226C",bfr:"\u{1D51F}",bigcirc:"\u25EF",xcirc:"\u25EF",bigodot:"\u2A00",xodot:"\u2A00",bigoplus:"\u2A01",xoplus:"\u2A01",bigotimes:"\u2A02",xotime:"\u2A02",bigsqcup:"\u2A06",xsqcup:"\u2A06",bigstar:"\u2605",starf:"\u2605",bigtriangledown:"\u25BD",xdtri:"\u25BD",bigtriangleup:"\u25B3",xutri:"\u25B3",biguplus:"\u2A04",xuplus:"\u2A04",bkarow:"\u290D",rbarr:"\u290D",blacklozenge:"\u29EB",lozf:"\u29EB",blacktriangle:"\u25B4",utrif:"\u25B4",blacktriangledown:"\u25BE",dtrif:"\u25BE",blacktriangleleft:"\u25C2",ltrif:"\u25C2",blacktriangleright:"\u25B8",rtrif:"\u25B8",blank:"\u2423",blk12:"\u2592",blk14:"\u2591",blk34:"\u2593",block:"\u2588",bne:"=\u20E5",bnequiv:"\u2261\u20E5",bnot:"\u2310",bopf:"\u{1D553}",bowtie:"\u22C8",boxDL:"\u2557",boxDR:"\u2554",boxDl:"\u2556",boxDr:"\u2553",boxH:"\u2550",boxHD:"\u2566",boxHU:"\u2569",boxHd:"\u2564",boxHu:"\u2567",boxUL:"\u255D",boxUR:"\u255A",boxUl:"\u255C",boxUr:"\u2559",boxV:"\u2551",boxVH:"\u256C",boxVL:"\u2563",boxVR:"\u2560",boxVh:"\u256B",boxVl:"\u2562",boxVr:"\u255F",boxbox:"\u29C9",boxdL:"\u2555",boxdR:"\u2552",boxdl:"\u2510",boxdr:"\u250C",boxhD:"\u2565",boxhU:"\u2568",boxhd:"\u252C",boxhu:"\u2534",boxminus:"\u229F",minusb:"\u229F",boxplus:"\u229E",plusb:"\u229E",boxtimes:"\u22A0",timesb:"\u22A0",boxuL:"\u255B",boxuR:"\u2558",boxul:"\u2518",boxur:"\u2514",boxv:"\u2502",boxvH:"\u256A",boxvL:"\u2561",boxvR:"\u255E",boxvh:"\u253C",boxvl:"\u2524",boxvr:"\u251C",brvbar:"\xA6",bscr:"\u{1D4B7}",bsemi:"\u204F",bsol:"\\",bsolb:"\u29C5",bsolhsub:"\u27C8",bull:"\u2022",bullet:"\u2022",bumpE:"\u2AAE",cacute:"\u0107",cap:"\u2229",capand:"\u2A44",capbrcup:"\u2A49",capcap:"\u2A4B",capcup:"\u2A47",capdot:"\u2A40",caps:"\u2229\uFE00",caret:"\u2041",ccaps:"\u2A4D",ccaron:"\u010D",ccedil:"\xE7",ccirc:"\u0109",ccups:"\u2A4C",ccupssm:"\u2A50",cdot:"\u010B",cemptyv:"\u29B2",cent:"\xA2",cfr:"\u{1D520}",chcy:"\u0447",check:"\u2713",checkmark:"\u2713",chi:"\u03C7",cir:"\u25CB",cirE:"\u29C3",circ:"\u02C6",circeq:"\u2257",cire:"\u2257",circlearrowleft:"\u21BA",olarr:"\u21BA",circlearrowright:"\u21BB",orarr:"\u21BB",circledS:"\u24C8",oS:"\u24C8",circledast:"\u229B",oast:"\u229B",circledcirc:"\u229A",ocir:"\u229A",circleddash:"\u229D",odash:"\u229D",cirfnint:"\u2A10",cirmid:"\u2AEF",cirscir:"\u29C2",clubs:"\u2663",clubsuit:"\u2663",colon:":",comma:",",commat:"@",comp:"\u2201",complement:"\u2201",congdot:"\u2A6D",copf:"\u{1D554}",copysr:"\u2117",crarr:"\u21B5",cross:"\u2717",cscr:"\u{1D4B8}",csub:"\u2ACF",csube:"\u2AD1",csup:"\u2AD0",csupe:"\u2AD2",ctdot:"\u22EF",cudarrl:"\u2938",cudarrr:"\u2935",cuepr:"\u22DE",curlyeqprec:"\u22DE",cuesc:"\u22DF",curlyeqsucc:"\u22DF",cularr:"\u21B6",curvearrowleft:"\u21B6",cularrp:"\u293D",cup:"\u222A",cupbrcap:"\u2A48",cupcap:"\u2A46",cupcup:"\u2A4A",cupdot:"\u228D",cupor:"\u2A45",cups:"\u222A\uFE00",curarr:"\u21B7",curvearrowright:"\u21B7",curarrm:"\u293C",curlyvee:"\u22CE",cuvee:"\u22CE",curlywedge:"\u22CF",cuwed:"\u22CF",curren:"\xA4",cwint:"\u2231",cylcty:"\u232D",dHar:"\u2965",dagger:"\u2020",daleth:"\u2138",dash:"\u2010",hyphen:"\u2010",dbkarow:"\u290F",rBarr:"\u290F",dcaron:"\u010F",dcy:"\u0434",ddarr:"\u21CA",downdownarrows:"\u21CA",ddotseq:"\u2A77",eDDot:"\u2A77",deg:"\xB0",delta:"\u03B4",demptyv:"\u29B1",dfisht:"\u297F",dfr:"\u{1D521}",diamondsuit:"\u2666",diams:"\u2666",digamma:"\u03DD",gammad:"\u03DD",disin:"\u22F2",div:"\xF7",divide:"\xF7",divideontimes:"\u22C7",divonx:"\u22C7",djcy:"\u0452",dlcorn:"\u231E",llcorner:"\u231E",dlcrop:"\u230D",dollar:"$",dopf:"\u{1D555}",doteqdot:"\u2251",eDot:"\u2251",dotminus:"\u2238",minusd:"\u2238",dotplus:"\u2214",plusdo:"\u2214",dotsquare:"\u22A1",sdotb:"\u22A1",drcorn:"\u231F",lrcorner:"\u231F",drcrop:"\u230C",dscr:"\u{1D4B9}",dscy:"\u0455",dsol:"\u29F6",dstrok:"\u0111",dtdot:"\u22F1",dtri:"\u25BF",triangledown:"\u25BF",dwangle:"\u29A6",dzcy:"\u045F",dzigrarr:"\u27FF",eacute:"\xE9",easter:"\u2A6E",ecaron:"\u011B",ecir:"\u2256",eqcirc:"\u2256",ecirc:"\xEA",ecolon:"\u2255",eqcolon:"\u2255",ecy:"\u044D",edot:"\u0117",efDot:"\u2252",fallingdotseq:"\u2252",efr:"\u{1D522}",eg:"\u2A9A",egrave:"\xE8",egs:"\u2A96",eqslantgtr:"\u2A96",egsdot:"\u2A98",el:"\u2A99",elinters:"\u23E7",ell:"\u2113",els:"\u2A95",eqslantless:"\u2A95",elsdot:"\u2A97",emacr:"\u0113",empty:"\u2205",emptyset:"\u2205",emptyv:"\u2205",varnothing:"\u2205",emsp13:"\u2004",emsp14:"\u2005",emsp:"\u2003",eng:"\u014B",ensp:"\u2002",eogon:"\u0119",eopf:"\u{1D556}",epar:"\u22D5",eparsl:"\u29E3",eplus:"\u2A71",epsi:"\u03B5",epsilon:"\u03B5",epsiv:"\u03F5",straightepsilon:"\u03F5",varepsilon:"\u03F5",equals:"=",equest:"\u225F",questeq:"\u225F",equivDD:"\u2A78",eqvparsl:"\u29E5",erDot:"\u2253",risingdotseq:"\u2253",erarr:"\u2971",escr:"\u212F",eta:"\u03B7",eth:"\xF0",euml:"\xEB",euro:"\u20AC",excl:"!",fcy:"\u0444",female:"\u2640",ffilig:"\uFB03",fflig:"\uFB00",ffllig:"\uFB04",ffr:"\u{1D523}",filig:"\uFB01",fjlig:"fj",flat:"\u266D",fllig:"\uFB02",fltns:"\u25B1",fnof:"\u0192",fopf:"\u{1D557}",fork:"\u22D4",pitchfork:"\u22D4",forkv:"\u2AD9",fpartint:"\u2A0D",frac12:"\xBD",half:"\xBD",frac13:"\u2153",frac14:"\xBC",frac15:"\u2155",frac16:"\u2159",frac18:"\u215B",frac23:"\u2154",frac25:"\u2156",frac34:"\xBE",frac35:"\u2157",frac38:"\u215C",frac45:"\u2158",frac56:"\u215A",frac58:"\u215D",frac78:"\u215E",frasl:"\u2044",frown:"\u2322",sfrown:"\u2322",fscr:"\u{1D4BB}",gEl:"\u2A8C",gtreqqless:"\u2A8C",gacute:"\u01F5",gamma:"\u03B3",gap:"\u2A86",gtrapprox:"\u2A86",gbreve:"\u011F",gcirc:"\u011D",gcy:"\u0433",gdot:"\u0121",gescc:"\u2AA9",gesdot:"\u2A80",gesdoto:"\u2A82",gesdotol:"\u2A84",gesl:"\u22DB\uFE00",gesles:"\u2A94",gfr:"\u{1D524}",gimel:"\u2137",gjcy:"\u0453",glE:"\u2A92",gla:"\u2AA5",glj:"\u2AA4",gnE:"\u2269",gneqq:"\u2269",gnap:"\u2A8A",gnapprox:"\u2A8A",gne:"\u2A88",gneq:"\u2A88",gnsim:"\u22E7",gopf:"\u{1D558}",gscr:"\u210A",gsime:"\u2A8E",gsiml:"\u2A90",gtcc:"\u2AA7",gtcir:"\u2A7A",gtdot:"\u22D7",gtrdot:"\u22D7",gtlPar:"\u2995",gtquest:"\u2A7C",gtrarr:"\u2978",gvertneqq:"\u2269\uFE00",gvnE:"\u2269\uFE00",hardcy:"\u044A",harrcir:"\u2948",harrw:"\u21AD",leftrightsquigarrow:"\u21AD",hbar:"\u210F",hslash:"\u210F",planck:"\u210F",plankv:"\u210F",hcirc:"\u0125",hearts:"\u2665",heartsuit:"\u2665",hellip:"\u2026",mldr:"\u2026",hercon:"\u22B9",hfr:"\u{1D525}",hksearow:"\u2925",searhk:"\u2925",hkswarow:"\u2926",swarhk:"\u2926",hoarr:"\u21FF",homtht:"\u223B",hookleftarrow:"\u21A9",larrhk:"\u21A9",hookrightarrow:"\u21AA",rarrhk:"\u21AA",hopf:"\u{1D559}",horbar:"\u2015",hscr:"\u{1D4BD}",hstrok:"\u0127",hybull:"\u2043",iacute:"\xED",icirc:"\xEE",icy:"\u0438",iecy:"\u0435",iexcl:"\xA1",ifr:"\u{1D526}",igrave:"\xEC",iiiint:"\u2A0C",qint:"\u2A0C",iiint:"\u222D",tint:"\u222D",iinfin:"\u29DC",iiota:"\u2129",ijlig:"\u0133",imacr:"\u012B",imath:"\u0131",inodot:"\u0131",imof:"\u22B7",imped:"\u01B5",incare:"\u2105",infin:"\u221E",infintie:"\u29DD",intcal:"\u22BA",intercal:"\u22BA",intlarhk:"\u2A17",intprod:"\u2A3C",iprod:"\u2A3C",iocy:"\u0451",iogon:"\u012F",iopf:"\u{1D55A}",iota:"\u03B9",iquest:"\xBF",iscr:"\u{1D4BE}",isinE:"\u22F9",isindot:"\u22F5",isins:"\u22F4",isinsv:"\u22F3",itilde:"\u0129",iukcy:"\u0456",iuml:"\xEF",jcirc:"\u0135",jcy:"\u0439",jfr:"\u{1D527}",jmath:"\u0237",jopf:"\u{1D55B}",jscr:"\u{1D4BF}",jsercy:"\u0458",jukcy:"\u0454",kappa:"\u03BA",kappav:"\u03F0",varkappa:"\u03F0",kcedil:"\u0137",kcy:"\u043A",kfr:"\u{1D528}",kgreen:"\u0138",khcy:"\u0445",kjcy:"\u045C",kopf:"\u{1D55C}",kscr:"\u{1D4C0}",lAtail:"\u291B",lBarr:"\u290E",lEg:"\u2A8B",lesseqqgtr:"\u2A8B",lHar:"\u2962",lacute:"\u013A",laemptyv:"\u29B4",lambda:"\u03BB",langd:"\u2991",lap:"\u2A85",lessapprox:"\u2A85",laquo:"\xAB",larrbfs:"\u291F",larrfs:"\u291D",larrlp:"\u21AB",looparrowleft:"\u21AB",larrpl:"\u2939",larrsim:"\u2973",larrtl:"\u21A2",leftarrowtail:"\u21A2",lat:"\u2AAB",latail:"\u2919",late:"\u2AAD",lates:"\u2AAD\uFE00",lbarr:"\u290C",lbbrk:"\u2772",lbrace:"{",lcub:"{",lbrack:"[",lsqb:"[",lbrke:"\u298B",lbrksld:"\u298F",lbrkslu:"\u298D",lcaron:"\u013E",lcedil:"\u013C",lcy:"\u043B",ldca:"\u2936",ldrdhar:"\u2967",ldrushar:"\u294B",ldsh:"\u21B2",le:"\u2264",leq:"\u2264",leftleftarrows:"\u21C7",llarr:"\u21C7",leftthreetimes:"\u22CB",lthree:"\u22CB",lescc:"\u2AA8",lesdot:"\u2A7F",lesdoto:"\u2A81",lesdotor:"\u2A83",lesg:"\u22DA\uFE00",lesges:"\u2A93",lessdot:"\u22D6",ltdot:"\u22D6",lfisht:"\u297C",lfr:"\u{1D529}",lgE:"\u2A91",lharul:"\u296A",lhblk:"\u2584",ljcy:"\u0459",llhard:"\u296B",lltri:"\u25FA",lmidot:"\u0140",lmoust:"\u23B0",lmoustache:"\u23B0",lnE:"\u2268",lneqq:"\u2268",lnap:"\u2A89",lnapprox:"\u2A89",lne:"\u2A87",lneq:"\u2A87",lnsim:"\u22E6",loang:"\u27EC",loarr:"\u21FD",longmapsto:"\u27FC",xmap:"\u27FC",looparrowright:"\u21AC",rarrlp:"\u21AC",lopar:"\u2985",lopf:"\u{1D55D}",loplus:"\u2A2D",lotimes:"\u2A34",lowast:"\u2217",loz:"\u25CA",lozenge:"\u25CA",lpar:"(",lparlt:"\u2993",lrhard:"\u296D",lrm:"\u200E",lrtri:"\u22BF",lsaquo:"\u2039",lscr:"\u{1D4C1}",lsime:"\u2A8D",lsimg:"\u2A8F",lsquor:"\u201A",sbquo:"\u201A",lstrok:"\u0142",ltcc:"\u2AA6",ltcir:"\u2A79",ltimes:"\u22C9",ltlarr:"\u2976",ltquest:"\u2A7B",ltrPar:"\u2996",ltri:"\u25C3",triangleleft:"\u25C3",lurdshar:"\u294A",luruhar:"\u2966",lvertneqq:"\u2268\uFE00",lvnE:"\u2268\uFE00",mDDot:"\u223A",macr:"\xAF",strns:"\xAF",male:"\u2642",malt:"\u2720",maltese:"\u2720",marker:"\u25AE",mcomma:"\u2A29",mcy:"\u043C",mdash:"\u2014",mfr:"\u{1D52A}",mho:"\u2127",micro:"\xB5",midcir:"\u2AF0",minus:"\u2212",minusdu:"\u2A2A",mlcp:"\u2ADB",models:"\u22A7",mopf:"\u{1D55E}",mscr:"\u{1D4C2}",mu:"\u03BC",multimap:"\u22B8",mumap:"\u22B8",nGg:"\u22D9\u0338",nGt:"\u226B\u20D2",nLeftarrow:"\u21CD",nlArr:"\u21CD",nLeftrightarrow:"\u21CE",nhArr:"\u21CE",nLl:"\u22D8\u0338",nLt:"\u226A\u20D2",nRightarrow:"\u21CF",nrArr:"\u21CF",nVDash:"\u22AF",nVdash:"\u22AE",nacute:"\u0144",nang:"\u2220\u20D2",napE:"\u2A70\u0338",napid:"\u224B\u0338",napos:"\u0149",natur:"\u266E",natural:"\u266E",ncap:"\u2A43",ncaron:"\u0148",ncedil:"\u0146",ncongdot:"\u2A6D\u0338",ncup:"\u2A42",ncy:"\u043D",ndash:"\u2013",neArr:"\u21D7",nearhk:"\u2924",nedot:"\u2250\u0338",nesear:"\u2928",toea:"\u2928",nfr:"\u{1D52B}",nharr:"\u21AE",nleftrightarrow:"\u21AE",nhpar:"\u2AF2",nis:"\u22FC",nisd:"\u22FA",njcy:"\u045A",nlE:"\u2266\u0338",nleqq:"\u2266\u0338",nlarr:"\u219A",nleftarrow:"\u219A",nldr:"\u2025",nopf:"\u{1D55F}",not:"\xAC",notinE:"\u22F9\u0338",notindot:"\u22F5\u0338",notinvb:"\u22F7",notinvc:"\u22F6",notnivb:"\u22FE",notnivc:"\u22FD",nparsl:"\u2AFD\u20E5",npart:"\u2202\u0338",npolint:"\u2A14",nrarr:"\u219B",nrightarrow:"\u219B",nrarrc:"\u2933\u0338",nrarrw:"\u219D\u0338",nscr:"\u{1D4C3}",nsub:"\u2284",nsubE:"\u2AC5\u0338",nsubseteqq:"\u2AC5\u0338",nsup:"\u2285",nsupE:"\u2AC6\u0338",nsupseteqq:"\u2AC6\u0338",ntilde:"\xF1",nu:"\u03BD",num:"#",numero:"\u2116",numsp:"\u2007",nvDash:"\u22AD",nvHarr:"\u2904",nvap:"\u224D\u20D2",nvdash:"\u22AC",nvge:"\u2265\u20D2",nvgt:">\u20D2",nvinfin:"\u29DE",nvlArr:"\u2902",nvle:"\u2264\u20D2",nvlt:"<\u20D2",nvltrie:"\u22B4\u20D2",nvrArr:"\u2903",nvrtrie:"\u22B5\u20D2",nvsim:"\u223C\u20D2",nwArr:"\u21D6",nwarhk:"\u2923",nwnear:"\u2927",oacute:"\xF3",ocirc:"\xF4",ocy:"\u043E",odblac:"\u0151",odiv:"\u2A38",odsold:"\u29BC",oelig:"\u0153",ofcir:"\u29BF",ofr:"\u{1D52C}",ogon:"\u02DB",ograve:"\xF2",ogt:"\u29C1",ohbar:"\u29B5",olcir:"\u29BE",olcross:"\u29BB",olt:"\u29C0",omacr:"\u014D",omega:"\u03C9",omicron:"\u03BF",omid:"\u29B6",oopf:"\u{1D560}",opar:"\u29B7",operp:"\u29B9",or:"\u2228",vee:"\u2228",ord:"\u2A5D",order:"\u2134",orderof:"\u2134",oscr:"\u2134",ordf:"\xAA",ordm:"\xBA",origof:"\u22B6",oror:"\u2A56",orslope:"\u2A57",orv:"\u2A5B",oslash:"\xF8",osol:"\u2298",otilde:"\xF5",otimesas:"\u2A36",ouml:"\xF6",ovbar:"\u233D",para:"\xB6",parsim:"\u2AF3",parsl:"\u2AFD",pcy:"\u043F",percnt:"%",period:".",permil:"\u2030",pertenk:"\u2031",pfr:"\u{1D52D}",phi:"\u03C6",phiv:"\u03D5",straightphi:"\u03D5",varphi:"\u03D5",phone:"\u260E",pi:"\u03C0",piv:"\u03D6",varpi:"\u03D6",planckh:"\u210E",plus:"+",plusacir:"\u2A23",pluscir:"\u2A22",plusdu:"\u2A25",pluse:"\u2A72",plussim:"\u2A26",plustwo:"\u2A27",pointint:"\u2A15",popf:"\u{1D561}",pound:"\xA3",prE:"\u2AB3",prap:"\u2AB7",precapprox:"\u2AB7",precnapprox:"\u2AB9",prnap:"\u2AB9",precneqq:"\u2AB5",prnE:"\u2AB5",precnsim:"\u22E8",prnsim:"\u22E8",prime:"\u2032",profalar:"\u232E",profline:"\u2312",profsurf:"\u2313",prurel:"\u22B0",pscr:"\u{1D4C5}",psi:"\u03C8",puncsp:"\u2008",qfr:"\u{1D52E}",qopf:"\u{1D562}",qprime:"\u2057",qscr:"\u{1D4C6}",quatint:"\u2A16",quest:"?",rAtail:"\u291C",rHar:"\u2964",race:"\u223D\u0331",racute:"\u0155",raemptyv:"\u29B3",rangd:"\u2992",range:"\u29A5",raquo:"\xBB",rarrap:"\u2975",rarrbfs:"\u2920",rarrc:"\u2933",rarrfs:"\u291E",rarrpl:"\u2945",rarrsim:"\u2974",rarrtl:"\u21A3",rightarrowtail:"\u21A3",rarrw:"\u219D",rightsquigarrow:"\u219D",ratail:"\u291A",ratio:"\u2236",rbbrk:"\u2773",rbrace:"}",rcub:"}",rbrack:"]",rsqb:"]",rbrke:"\u298C",rbrksld:"\u298E",rbrkslu:"\u2990",rcaron:"\u0159",rcedil:"\u0157",rcy:"\u0440",rdca:"\u2937",rdldhar:"\u2969",rdsh:"\u21B3",rect:"\u25AD",rfisht:"\u297D",rfr:"\u{1D52F}",rharul:"\u296C",rho:"\u03C1",rhov:"\u03F1",varrho:"\u03F1",rightrightarrows:"\u21C9",rrarr:"\u21C9",rightthreetimes:"\u22CC",rthree:"\u22CC",ring:"\u02DA",rlm:"\u200F",rmoust:"\u23B1",rmoustache:"\u23B1",rnmid:"\u2AEE",roang:"\u27ED",roarr:"\u21FE",ropar:"\u2986",ropf:"\u{1D563}",roplus:"\u2A2E",rotimes:"\u2A35",rpar:")",rpargt:"\u2994",rppolint:"\u2A12",rsaquo:"\u203A",rscr:"\u{1D4C7}",rtimes:"\u22CA",rtri:"\u25B9",triangleright:"\u25B9",rtriltri:"\u29CE",ruluhar:"\u2968",rx:"\u211E",sacute:"\u015B",scE:"\u2AB4",scap:"\u2AB8",succapprox:"\u2AB8",scaron:"\u0161",scedil:"\u015F",scirc:"\u015D",scnE:"\u2AB6",succneqq:"\u2AB6",scnap:"\u2ABA",succnapprox:"\u2ABA",scnsim:"\u22E9",succnsim:"\u22E9",scpolint:"\u2A13",scy:"\u0441",sdot:"\u22C5",sdote:"\u2A66",seArr:"\u21D8",sect:"\xA7",semi:";",seswar:"\u2929",tosa:"\u2929",sext:"\u2736",sfr:"\u{1D530}",sharp:"\u266F",shchcy:"\u0449",shcy:"\u0448",shy:"\xAD",sigma:"\u03C3",sigmaf:"\u03C2",sigmav:"\u03C2",varsigma:"\u03C2",simdot:"\u2A6A",simg:"\u2A9E",simgE:"\u2AA0",siml:"\u2A9D",simlE:"\u2A9F",simne:"\u2246",simplus:"\u2A24",simrarr:"\u2972",smashp:"\u2A33",smeparsl:"\u29E4",smile:"\u2323",ssmile:"\u2323",smt:"\u2AAA",smte:"\u2AAC",smtes:"\u2AAC\uFE00",softcy:"\u044C",sol:"/",solb:"\u29C4",solbar:"\u233F",sopf:"\u{1D564}",spades:"\u2660",spadesuit:"\u2660",sqcaps:"\u2293\uFE00",sqcups:"\u2294\uFE00",sscr:"\u{1D4C8}",star:"\u2606",sub:"\u2282",subset:"\u2282",subE:"\u2AC5",subseteqq:"\u2AC5",subdot:"\u2ABD",subedot:"\u2AC3",submult:"\u2AC1",subnE:"\u2ACB",subsetneqq:"\u2ACB",subne:"\u228A",subsetneq:"\u228A",subplus:"\u2ABF",subrarr:"\u2979",subsim:"\u2AC7",subsub:"\u2AD5",subsup:"\u2AD3",sung:"\u266A",sup1:"\xB9",sup2:"\xB2",sup3:"\xB3",supE:"\u2AC6",supseteqq:"\u2AC6",supdot:"\u2ABE",supdsub:"\u2AD8",supedot:"\u2AC4",suphsol:"\u27C9",suphsub:"\u2AD7",suplarr:"\u297B",supmult:"\u2AC2",supnE:"\u2ACC",supsetneqq:"\u2ACC",supne:"\u228B",supsetneq:"\u228B",supplus:"\u2AC0",supsim:"\u2AC8",supsub:"\u2AD4",supsup:"\u2AD6",swArr:"\u21D9",swnwar:"\u292A",szlig:"\xDF",target:"\u2316",tau:"\u03C4",tcaron:"\u0165",tcedil:"\u0163",tcy:"\u0442",telrec:"\u2315",tfr:"\u{1D531}",theta:"\u03B8",thetasym:"\u03D1",thetav:"\u03D1",vartheta:"\u03D1",thorn:"\xFE",times:"\xD7",timesbar:"\u2A31",timesd:"\u2A30",topbot:"\u2336",topcir:"\u2AF1",topf:"\u{1D565}",topfork:"\u2ADA",tprime:"\u2034",triangle:"\u25B5",utri:"\u25B5",triangleq:"\u225C",trie:"\u225C",tridot:"\u25EC",triminus:"\u2A3A",triplus:"\u2A39",trisb:"\u29CD",tritime:"\u2A3B",trpezium:"\u23E2",tscr:"\u{1D4C9}",tscy:"\u0446",tshcy:"\u045B",tstrok:"\u0167",uHar:"\u2963",uacute:"\xFA",ubrcy:"\u045E",ubreve:"\u016D",ucirc:"\xFB",ucy:"\u0443",udblac:"\u0171",ufisht:"\u297E",ufr:"\u{1D532}",ugrave:"\xF9",uhblk:"\u2580",ulcorn:"\u231C",ulcorner:"\u231C",ulcrop:"\u230F",ultri:"\u25F8",umacr:"\u016B",uogon:"\u0173",uopf:"\u{1D566}",upsi:"\u03C5",upsilon:"\u03C5",upuparrows:"\u21C8",uuarr:"\u21C8",urcorn:"\u231D",urcorner:"\u231D",urcrop:"\u230E",uring:"\u016F",urtri:"\u25F9",uscr:"\u{1D4CA}",utdot:"\u22F0",utilde:"\u0169",uuml:"\xFC",uwangle:"\u29A7",vBar:"\u2AE8",vBarv:"\u2AE9",vangrt:"\u299C",varsubsetneq:"\u228A\uFE00",vsubne:"\u228A\uFE00",varsubsetneqq:"\u2ACB\uFE00",vsubnE:"\u2ACB\uFE00",varsupsetneq:"\u228B\uFE00",vsupne:"\u228B\uFE00",varsupsetneqq:"\u2ACC\uFE00",vsupnE:"\u2ACC\uFE00",vcy:"\u0432",veebar:"\u22BB",veeeq:"\u225A",vellip:"\u22EE",vfr:"\u{1D533}",vopf:"\u{1D567}",vscr:"\u{1D4CB}",vzigzag:"\u299A",wcirc:"\u0175",wedbar:"\u2A5F",wedgeq:"\u2259",weierp:"\u2118",wp:"\u2118",wfr:"\u{1D534}",wopf:"\u{1D568}",wscr:"\u{1D4CC}",xfr:"\u{1D535}",xi:"\u03BE",xnis:"\u22FB",xopf:"\u{1D569}",xscr:"\u{1D4CD}",yacute:"\xFD",yacy:"\u044F",ycirc:"\u0177",ycy:"\u044B",yen:"\xA5",yfr:"\u{1D536}",yicy:"\u0457",yopf:"\u{1D56A}",yscr:"\u{1D4CE}",yucy:"\u044E",yuml:"\xFF",zacute:"\u017A",zcaron:"\u017E",zcy:"\u0437",zdot:"\u017C",zeta:"\u03B6",zfr:"\u{1D537}",zhcy:"\u0436",zigrarr:"\u21DD",zopf:"\u{1D56B}",zscr:"\u{1D4CF}",zwj:"\u200D",zwnj:"\u200C"},co$1="\uE500";Te.ngsp=co$1;var l=(function(e){return e[e.TAG_OPEN_START=0]="TAG_OPEN_START",e[e.TAG_OPEN_END=1]="TAG_OPEN_END",e[e.TAG_OPEN_END_VOID=2]="TAG_OPEN_END_VOID",e[e.TAG_CLOSE=3]="TAG_CLOSE",e[e.INCOMPLETE_TAG_OPEN=4]="INCOMPLETE_TAG_OPEN",e[e.TEXT=5]="TEXT",e[e.ESCAPABLE_RAW_TEXT=6]="ESCAPABLE_RAW_TEXT",e[e.RAW_TEXT=7]="RAW_TEXT",e[e.INTERPOLATION=8]="INTERPOLATION",e[e.ENCODED_ENTITY=9]="ENCODED_ENTITY",e[e.COMMENT_START=10]="COMMENT_START",e[e.COMMENT_END=11]="COMMENT_END",e[e.CDATA_START=12]="CDATA_START",e[e.CDATA_END=13]="CDATA_END",e[e.ATTR_NAME=14]="ATTR_NAME",e[e.ATTR_QUOTE=15]="ATTR_QUOTE",e[e.ATTR_VALUE_TEXT=16]="ATTR_VALUE_TEXT",e[e.ATTR_VALUE_INTERPOLATION=17]="ATTR_VALUE_INTERPOLATION",e[e.DOC_TYPE_START=18]="DOC_TYPE_START",e[e.DOC_TYPE_END=19]="DOC_TYPE_END",e[e.EXPANSION_FORM_START=20]="EXPANSION_FORM_START",e[e.EXPANSION_CASE_VALUE=21]="EXPANSION_CASE_VALUE",e[e.EXPANSION_CASE_EXP_START=22]="EXPANSION_CASE_EXP_START",e[e.EXPANSION_CASE_EXP_END=23]="EXPANSION_CASE_EXP_END",e[e.EXPANSION_FORM_END=24]="EXPANSION_FORM_END",e[e.BLOCK_OPEN_START=25]="BLOCK_OPEN_START",e[e.BLOCK_OPEN_END=26]="BLOCK_OPEN_END",e[e.BLOCK_CLOSE=27]="BLOCK_CLOSE",e[e.BLOCK_PARAMETER=28]="BLOCK_PARAMETER",e[e.INCOMPLETE_BLOCK_OPEN=29]="INCOMPLETE_BLOCK_OPEN",e[e.LET_START=30]="LET_START",e[e.LET_VALUE=31]="LET_VALUE",e[e.LET_END=32]="LET_END",e[e.INCOMPLETE_LET=33]="INCOMPLETE_LET",e[e.COMPONENT_OPEN_START=34]="COMPONENT_OPEN_START",e[e.COMPONENT_OPEN_END=35]="COMPONENT_OPEN_END",e[e.COMPONENT_OPEN_END_VOID=36]="COMPONENT_OPEN_END_VOID",e[e.COMPONENT_CLOSE=37]="COMPONENT_CLOSE",e[e.INCOMPLETE_COMPONENT_OPEN=38]="INCOMPLETE_COMPONENT_OPEN",e[e.DIRECTIVE_NAME=39]="DIRECTIVE_NAME",e[e.DIRECTIVE_OPEN=40]="DIRECTIVE_OPEN",e[e.DIRECTIVE_CLOSE=41]="DIRECTIVE_CLOSE",e[e.EOF=42]="EOF",e})({});var Lo$1=class Lo{constructor(e,t,r){this.tokens=e,this.errors=t,this.nonNormalizedIcuExpressions=r;}};function ns(e,t,r,n={}){let i=new Io$1(new mt$1(e,t),r,n);return i.tokenize(),new Lo$1(Vo$1(i.tokens),i.errors,i.nonNormalizedIcuExpressions)}var Po$1=/\r\n?/g;function be$1(e){return `Unexpected character "${e===0?"EOF":String.fromCharCode(e)}"`}function Qi(e){return `Unknown entity "${e}" - use the "&#<decimal>;" or  "&#x<hex>;" syntax`}function Oo$1(e,t){return `Unable to parse entity "${t}" - ${e} character reference entities must end with ";"`}var Mr$1=(function(e){return e.HEX="hexadecimal",e.DEC="decimal",e})(Mr$1||{}),Do$1=["@if","@else","@for","@switch","@case","@default","@empty","@defer","@placeholder","@loading","@error"],ft$1={start:"{{",end:"}}"},Io$1=class Io{constructor(e,t,r){this._getTagContentType=t,this._currentTokenStart=null,this._currentTokenType=null,this._expansionCaseStack=[],this._openDirectiveCount=0,this._inInterpolation=false,this._fullNameStack=[],this.tokens=[],this.errors=[],this.nonNormalizedIcuExpressions=[],this._tokenizeIcu=r.tokenizeExpansionForms||false,this._leadingTriviaCodePoints=r.leadingTriviaChars&&r.leadingTriviaChars.map(i=>i.codePointAt(0)||0),this._canSelfClose=r.canSelfClose||false,this._allowHtmComponentClosingTags=r.allowHtmComponentClosingTags||false;let n=r.range||{endPos:e.content.length,startPos:0,startLine:0,startCol:0};this._cursor=r.escapedString?new Uo$1(e,n):new is(e,n),this._preserveLineEndings=r.preserveLineEndings||false,this._i18nNormalizeLineEndingsInICUs=r.i18nNormalizeLineEndingsInICUs||false,this._tokenizeBlocks=r.tokenizeBlocks??true,this._tokenizeLet=r.tokenizeLet??true,this._selectorlessEnabled=r.selectorlessEnabled??false;try{this._cursor.init();}catch(i){this.handleError(i);}}_processCarriageReturns(e){return this._preserveLineEndings?e:e.replace(Po$1,`
`)}tokenize(){for(;this._cursor.peek()!==0;){let e=this._cursor.clone();try{if(this._attemptCharCode(60))if(this._attemptCharCode(33))this._attemptStr("[CDATA[")?this._consumeCdata(e):this._attemptStr("--")?this._consumeComment(e):this._attemptStrCaseInsensitive("doctype")?this._consumeDocType(e):this._consumeBogusComment(e);else if(this._attemptCharCode(47))this._consumeTagClose(e);else {let t=this._cursor.clone();this._attemptCharCode(63)?(this._cursor=t,this._consumeBogusComment(e)):this._consumeTagOpen(e);}else this._tokenizeLet&&this._cursor.peek()===64&&!this._inInterpolation&&this._isLetStart()?this._consumeLetDeclaration(e):this._tokenizeBlocks&&this._isBlockStart()?this._consumeBlockStart(e):this._tokenizeBlocks&&!this._inInterpolation&&!this._isInExpansionCase()&&!this._isInExpansionForm()&&this._attemptCharCode(125)?this._consumeBlockEnd(e):this._tokenizeIcu&&this._tokenizeExpansionForm()||this._consumeWithInterpolation(l.TEXT,l.INTERPOLATION,()=>this._isTextEnd(),()=>this._isTagStart());}catch(t){this.handleError(t);}}this._beginToken(l.EOF),this._endToken([]);}_getBlockName(){let e=false,t=this._cursor.clone();return this._attemptCharCodeUntilFn(r=>ct$1(r)?!e:Ho$1(r)?(e=true,false):true),this._cursor.getChars(t).trim()}_consumeBlockStart(e){this._requireCharCode(64),this._beginToken(l.BLOCK_OPEN_START,e);let t=this._endToken([this._getBlockName()]);if(this._cursor.peek()===40)if(this._cursor.advance(),this._consumeBlockParameters(),this._attemptCharCodeUntilFn(T$1),this._attemptCharCode(41))this._attemptCharCodeUntilFn(T$1);else {t.type=l.INCOMPLETE_BLOCK_OPEN;return}this._attemptCharCode(123)?(this._beginToken(l.BLOCK_OPEN_END),this._endToken([])):this._isBlockStart()&&(t.parts[0]==="case"||t.parts[0]==="default")?(this._beginToken(l.BLOCK_OPEN_END),this._endToken([]),this._beginToken(l.BLOCK_CLOSE),this._endToken([])):t.type=l.INCOMPLETE_BLOCK_OPEN;}_consumeBlockEnd(e){this._beginToken(l.BLOCK_CLOSE,e),this._endToken([]);}_consumeBlockParameters(){for(this._attemptCharCodeUntilFn(Zi);this._cursor.peek()!==41&&this._cursor.peek()!==0;){this._beginToken(l.BLOCK_PARAMETER);let e=this._cursor.clone(),t=null,r=0;for(;this._cursor.peek()!==59&&this._cursor.peek()!==0||t!==null;){let n=this._cursor.peek();if(n===92)this._cursor.advance();else if(n===t)t=null;else if(t===null&&Ut$1(n))t=n;else if(n===40&&t===null)r++;else if(n===41&&t===null){if(r===0)break;r>0&&r--;}this._cursor.advance();}this._endToken([this._cursor.getChars(e)]),this._attemptCharCodeUntilFn(Zi);}}_consumeLetDeclaration(e){if(this._requireStr("@let"),this._beginToken(l.LET_START,e),ct$1(this._cursor.peek()))this._attemptCharCodeUntilFn(T$1);else {let r=this._endToken([this._cursor.getChars(e)]);r.type=l.INCOMPLETE_LET;return}let t=this._endToken([this._getLetDeclarationName()]);if(this._attemptCharCodeUntilFn(T$1),!this._attemptCharCode(61)){t.type=l.INCOMPLETE_LET;return}this._attemptCharCodeUntilFn(r=>T$1(r)&&!pt$1(r)),this._consumeLetDeclarationValue(),this._cursor.peek()===59?(this._beginToken(l.LET_END),this._endToken([]),this._cursor.advance()):(t.type=l.INCOMPLETE_LET,t.sourceSpan=this._cursor.getSpan(e));}_getLetDeclarationName(){let e=this._cursor.clone(),t=false;return this._attemptCharCodeUntilFn(r=>Fe$1(r)||r===36||r===95||t&&ut$1(r)?(t=true,false):true),this._cursor.getChars(e).trim()}_consumeLetDeclarationValue(){let e=this._cursor.clone();for(this._beginToken(l.LET_VALUE,e);this._cursor.peek()!==0;){let t=this._cursor.peek();if(t===59)break;Ut$1(t)&&(this._cursor.advance(),this._attemptCharCodeUntilFn(r=>r===92?(this._cursor.advance(),false):r===t)),this._cursor.advance();}this._endToken([this._cursor.getChars(e)]);}_tokenizeExpansionForm(){if(this.isExpansionFormStart())return this._consumeExpansionFormStart(),true;if(Fo$1(this._cursor.peek())&&this._isInExpansionForm())return this._consumeExpansionCaseStart(),true;if(this._cursor.peek()===125){if(this._isInExpansionCase())return this._consumeExpansionCaseEnd(),true;if(this._isInExpansionForm())return this._consumeExpansionFormEnd(),true}return  false}_beginToken(e,t=this._cursor.clone()){this._currentTokenStart=t,this._currentTokenType=e;}_endToken(e,t){if(this._currentTokenStart===null)throw new ne(this._cursor.getSpan(t),"Programming error - attempted to end a token when there was no start to the token");if(this._currentTokenType===null)throw new ne(this._cursor.getSpan(this._currentTokenStart),"Programming error - attempted to end a token which has no token type");let r={type:this._currentTokenType,parts:e,sourceSpan:(t??this._cursor).getSpan(this._currentTokenStart,this._leadingTriviaCodePoints)};return this.tokens.push(r),this._currentTokenStart=null,this._currentTokenType=null,r}_createError(e,t){this._isInExpansionForm()&&(e+=` (Do you have an unescaped "{" in your template? Use "{{ '{' }}") to escape it.)`);let r=new ne(t,e);return this._currentTokenStart=null,this._currentTokenType=null,r}handleError(e){if(e instanceof Vr$1&&(e=this._createError(e.msg,this._cursor.getSpan(e.cursor))),e instanceof ne)this.errors.push(e);else throw e}_attemptCharCode(e){return this._cursor.peek()===e?(this._cursor.advance(),true):false}_attemptCharCodeCaseInsensitive(e){return qo$1(this._cursor.peek(),e)?(this._cursor.advance(),true):false}_requireCharCode(e){let t=this._cursor.clone();if(!this._attemptCharCode(e))throw this._createError(be$1(this._cursor.peek()),this._cursor.getSpan(t))}_attemptStr(e){let t=e.length;if(this._cursor.charsLeft()<t)return  false;let r=this._cursor.clone();for(let n=0;n<t;n++)if(!this._attemptCharCode(e.charCodeAt(n)))return this._cursor=r,false;return  true}_attemptStrCaseInsensitive(e){for(let t=0;t<e.length;t++)if(!this._attemptCharCodeCaseInsensitive(e.charCodeAt(t)))return  false;return  true}_requireStr(e){let t=this._cursor.clone();if(!this._attemptStr(e))throw this._createError(be$1(this._cursor.peek()),this._cursor.getSpan(t))}_requireStrCaseInsensitive(e){let t=this._cursor.clone();if(!this._attemptStrCaseInsensitive(e))throw this._createError(be$1(this._cursor.peek()),this._cursor.getSpan(t))}_attemptCharCodeUntilFn(e){for(;!e(this._cursor.peek());)this._cursor.advance();}_requireCharCodeUntilFn(e,t){let r=this._cursor.clone();if(this._attemptCharCodeUntilFn(e),this._cursor.diff(r)<t)throw this._createError(be$1(this._cursor.peek()),this._cursor.getSpan(r))}_attemptUntilChar(e){for(;this._cursor.peek()!==e;)this._cursor.advance();}_readChar(){let e=String.fromCodePoint(this._cursor.peek());return this._cursor.advance(),e}_peekStr(e){let t=e.length;if(this._cursor.charsLeft()<t)return  false;let r=this._cursor.clone();for(let n=0;n<t;n++){if(r.peek()!==e.charCodeAt(n))return  false;r.advance();}return  true}_isBlockStart(){return this._cursor.peek()===64&&Do$1.some(e=>this._peekStr(e))}_isLetStart(){return this._cursor.peek()===64&&this._peekStr("@let")}_consumeEntity(e){this._beginToken(l.ENCODED_ENTITY);let t=this._cursor.clone();if(this._cursor.advance(),this._attemptCharCode(35)){let r=this._attemptCharCode(120)||this._attemptCharCode(88),n=this._cursor.clone();if(this._attemptCharCodeUntilFn(Mo$1),this._cursor.peek()!=59){this._cursor.advance();let s=r?Mr$1.HEX:Mr$1.DEC;throw this._createError(Oo$1(s,this._cursor.getChars(t)),this._cursor.getSpan())}let i=this._cursor.getChars(n);this._cursor.advance();try{let s=parseInt(i,r?16:10);this._endToken([String.fromCodePoint(s),this._cursor.getChars(t)]);}catch{throw this._createError(Qi(this._cursor.getChars(t)),this._cursor.getSpan())}}else {let r=this._cursor.clone();if(this._attemptCharCodeUntilFn(Bo$1),this._cursor.peek()!=59)this._beginToken(e,t),this._cursor=r,this._endToken(["&"]);else {let n=this._cursor.getChars(r);this._cursor.advance();let i=Te.hasOwnProperty(n)&&Te[n];if(!i)throw this._createError(Qi(n),this._cursor.getSpan(t));this._endToken([i,`&${n};`]);}}}_consumeRawText(e,t){this._beginToken(e?l.ESCAPABLE_RAW_TEXT:l.RAW_TEXT);let r=[];for(;;){let n=this._cursor.clone(),i=t();if(this._cursor=n,i)break;e&&this._cursor.peek()===38?(this._endToken([this._processCarriageReturns(r.join(""))]),r.length=0,this._consumeEntity(l.ESCAPABLE_RAW_TEXT),this._beginToken(l.ESCAPABLE_RAW_TEXT)):r.push(this._readChar());}this._endToken([this._processCarriageReturns(r.join(""))]);}_consumeComment(e){this._beginToken(l.COMMENT_START,e),this._endToken([]),this._consumeRawText(false,()=>this._attemptStr("-->")),this._beginToken(l.COMMENT_END),this._requireStr("-->"),this._endToken([]);}_consumeBogusComment(e){this._beginToken(l.COMMENT_START,e),this._endToken([]),this._consumeRawText(false,()=>this._cursor.peek()===62),this._beginToken(l.COMMENT_END),this._cursor.advance(),this._endToken([]);}_consumeCdata(e){this._beginToken(l.CDATA_START,e),this._endToken([]),this._consumeRawText(false,()=>this._attemptStr("]]>")),this._beginToken(l.CDATA_END),this._requireStr("]]>"),this._endToken([]);}_consumeDocType(e){this._beginToken(l.DOC_TYPE_START,e),this._endToken([]),this._consumeRawText(false,()=>this._cursor.peek()===62),this._beginToken(l.DOC_TYPE_END),this._cursor.advance(),this._endToken([]);}_consumePrefixAndName(e){let t=this._cursor.clone(),r="";for(;this._cursor.peek()!==58&&!Ro$1(this._cursor.peek());)this._cursor.advance();let n;this._cursor.peek()===58?(r=this._cursor.getChars(t),this._cursor.advance(),n=this._cursor.clone()):n=t,this._requireCharCodeUntilFn(e,r===""?0:1);let i=this._cursor.getChars(n);return [r,i]}_consumeTagOpen(e){let t,r,n,i,s=[];try{if(this._selectorlessEnabled&&zt$1(this._cursor.peek()))i=this._consumeComponentOpenStart(e),[n,r,t]=i.parts,r&&(n+=`:${r}`),t&&(n+=`:${t}`),this._attemptCharCodeUntilFn(T$1);else {if(!Fe$1(this._cursor.peek()))throw this._createError(be$1(this._cursor.peek()),this._cursor.getSpan(e));i=this._consumeTagOpenStart(e),r=i.parts[0],t=n=i.parts[1],this._attemptCharCodeUntilFn(T$1);}for(;!ts(this._cursor.peek());)if(this._selectorlessEnabled&&this._cursor.peek()===64){let o=this._cursor.clone(),c=o.clone();c.advance(),zt$1(c.peek())&&this._consumeDirective(o,c);}else {let o=this._consumeAttribute();s.push(o);}i.type===l.COMPONENT_OPEN_START?this._consumeComponentOpenEnd():this._consumeTagOpenEnd();}catch(o){if(o instanceof ne){i?i.type=i.type===l.COMPONENT_OPEN_START?l.INCOMPLETE_COMPONENT_OPEN:l.INCOMPLETE_TAG_OPEN:(this._beginToken(l.TEXT,e),this._endToken(["<"]));return}throw o}if(this._canSelfClose&&this.tokens[this.tokens.length-1].type===l.TAG_OPEN_END_VOID)return;let a=this._getTagContentType(t,r,this._fullNameStack.length>0,s);this._handleFullNameStackForTagOpen(r,t),a===R$1.RAW_TEXT?this._consumeRawTextWithTagClose(r,i,n,false):a===R$1.ESCAPABLE_RAW_TEXT&&this._consumeRawTextWithTagClose(r,i,n,true);}_consumeRawTextWithTagClose(e,t,r,n){this._consumeRawText(n,()=>!this._attemptCharCode(60)||!this._attemptCharCode(47)||(this._attemptCharCodeUntilFn(T$1),!this._attemptStrCaseInsensitive(e&&t.type!==l.COMPONENT_OPEN_START?`${e}:${r}`:r))?false:(this._attemptCharCodeUntilFn(T$1),this._attemptCharCode(62))),this._beginToken(t.type===l.COMPONENT_OPEN_START?l.COMPONENT_CLOSE:l.TAG_CLOSE),this._requireCharCodeUntilFn(i=>i===62,3),this._cursor.advance(),this._endToken(t.parts),this._handleFullNameStackForTagClose(e,r);}_consumeTagOpenStart(e){this._beginToken(l.TAG_OPEN_START,e);let t=this._consumePrefixAndName(we$1);return this._endToken(t)}_consumeComponentOpenStart(e){this._beginToken(l.COMPONENT_OPEN_START,e);let t=this._consumeComponentName();return this._endToken(t)}_consumeComponentName(){let e=this._cursor.clone();for(;es(this._cursor.peek());)this._cursor.advance();let t=this._cursor.getChars(e),r="",n="";return this._cursor.peek()===58&&(this._cursor.advance(),[r,n]=this._consumePrefixAndName(we$1)),[t,r,n]}_consumeAttribute(){let[e,t]=this._consumeAttributeName(),r;return this._attemptCharCodeUntilFn(T$1),this._attemptCharCode(61)&&(this._attemptCharCodeUntilFn(T$1),r=this._consumeAttributeValue()),this._attemptCharCodeUntilFn(T$1),{prefix:e,name:t,value:r}}_consumeAttributeName(){let e=this._cursor.peek();if(e===39||e===34)throw this._createError(be$1(e),this._cursor.getSpan());this._beginToken(l.ATTR_NAME);let t;if(this._openDirectiveCount>0){let n=0;t=i=>{if(this._openDirectiveCount>0){if(i===40)n++;else if(i===41){if(n===0)return  true;n--;}}return we$1(i)};}else if(e===91){let n=0;t=i=>(i===91?n++:i===93&&n--,n<=0?we$1(i):pt$1(i));}else t=we$1;let r=this._consumePrefixAndName(t);return this._endToken(r),r}_consumeAttributeValue(){let e;if(this._cursor.peek()===39||this._cursor.peek()===34){let t=this._cursor.peek();this._consumeQuote(t);let r=()=>this._cursor.peek()===t;e=this._consumeWithInterpolation(l.ATTR_VALUE_TEXT,l.ATTR_VALUE_INTERPOLATION,r,r),this._consumeQuote(t);}else {let t=()=>we$1(this._cursor.peek());e=this._consumeWithInterpolation(l.ATTR_VALUE_TEXT,l.ATTR_VALUE_INTERPOLATION,t,t);}return e}_consumeQuote(e){this._beginToken(l.ATTR_QUOTE),this._requireCharCode(e),this._endToken([String.fromCodePoint(e)]);}_consumeTagOpenEnd(){let e=this._attemptCharCode(47)?l.TAG_OPEN_END_VOID:l.TAG_OPEN_END;this._beginToken(e),this._requireCharCode(62),this._endToken([]);}_consumeComponentOpenEnd(){let e=this._attemptCharCode(47)?l.COMPONENT_OPEN_END_VOID:l.COMPONENT_OPEN_END;this._beginToken(e),this._requireCharCode(62),this._endToken([]);}_consumeTagClose(e){if(this._selectorlessEnabled){let t=e.clone();for(;t.peek()!==62&&!zt$1(t.peek());)t.advance();if(zt$1(t.peek())){this._beginToken(l.COMPONENT_CLOSE,e);let r=this._consumeComponentName();this._attemptCharCodeUntilFn(T$1),this._requireCharCode(62),this._endToken(r);return}}if(this._beginToken(l.TAG_CLOSE,e),this._attemptCharCodeUntilFn(T$1),this._allowHtmComponentClosingTags&&this._attemptCharCode(47))this._attemptCharCodeUntilFn(T$1),this._requireCharCode(62),this._endToken([]);else {let[t,r]=this._consumePrefixAndName(we$1);this._attemptCharCodeUntilFn(T$1),this._requireCharCode(62),this._endToken([t,r]),this._handleFullNameStackForTagClose(t,r);}}_consumeExpansionFormStart(){this._beginToken(l.EXPANSION_FORM_START),this._requireCharCode(123),this._endToken([]),this._expansionCaseStack.push(l.EXPANSION_FORM_START),this._beginToken(l.RAW_TEXT);let e=this._readUntil(44),t=this._processCarriageReturns(e);if(this._i18nNormalizeLineEndingsInICUs)this._endToken([t]);else {let n=this._endToken([e]);t!==e&&this.nonNormalizedIcuExpressions.push(n);}this._requireCharCode(44),this._attemptCharCodeUntilFn(T$1),this._beginToken(l.RAW_TEXT);let r=this._readUntil(44);this._endToken([r]),this._requireCharCode(44),this._attemptCharCodeUntilFn(T$1);}_consumeExpansionCaseStart(){this._beginToken(l.EXPANSION_CASE_VALUE);let e=this._readUntil(123).trim();this._endToken([e]),this._attemptCharCodeUntilFn(T$1),this._beginToken(l.EXPANSION_CASE_EXP_START),this._requireCharCode(123),this._endToken([]),this._attemptCharCodeUntilFn(T$1),this._expansionCaseStack.push(l.EXPANSION_CASE_EXP_START);}_consumeExpansionCaseEnd(){this._beginToken(l.EXPANSION_CASE_EXP_END),this._requireCharCode(125),this._endToken([]),this._attemptCharCodeUntilFn(T$1),this._expansionCaseStack.pop();}_consumeExpansionFormEnd(){this._beginToken(l.EXPANSION_FORM_END),this._requireCharCode(125),this._endToken([]),this._expansionCaseStack.pop();}_consumeWithInterpolation(e,t,r,n){this._beginToken(e);let i=[];for(;!r();){let a=this._cursor.clone();this._attemptStr(ft$1.start)?(this._endToken([this._processCarriageReturns(i.join(""))],a),i.length=0,this._consumeInterpolation(t,a,n),this._beginToken(e)):this._cursor.peek()===38?(this._endToken([this._processCarriageReturns(i.join(""))]),i.length=0,this._consumeEntity(e),this._beginToken(e)):i.push(this._readChar());}this._inInterpolation=false;let s=this._processCarriageReturns(i.join(""));return this._endToken([s]),s}_consumeInterpolation(e,t,r){let n=[];this._beginToken(e,t),n.push(ft$1.start);let i=this._cursor.clone(),s=null,a=false;for(;this._cursor.peek()!==0&&(r===null||!r());){let o=this._cursor.clone();if(this._isTagStart()){this._cursor=o,n.push(this._getProcessedChars(i,o)),this._endToken(n);return}if(s===null)if(this._attemptStr(ft$1.end)){n.push(this._getProcessedChars(i,o)),n.push(ft$1.end),this._endToken(n);return}else this._attemptStr("//")&&(a=true);let c=this._cursor.peek();this._cursor.advance(),c===92?this._cursor.advance():c===s?s=null:!a&&s===null&&Ut$1(c)&&(s=c);}n.push(this._getProcessedChars(i,this._cursor)),this._endToken(n);}_consumeDirective(e,t){for(this._requireCharCode(64),this._cursor.advance();es(this._cursor.peek());)this._cursor.advance();this._beginToken(l.DIRECTIVE_NAME,e);let r=this._cursor.getChars(t);if(this._endToken([r]),this._attemptCharCodeUntilFn(T$1),this._cursor.peek()===40){for(this._openDirectiveCount++,this._beginToken(l.DIRECTIVE_OPEN),this._cursor.advance(),this._endToken([]),this._attemptCharCodeUntilFn(T$1);!ts(this._cursor.peek())&&this._cursor.peek()!==41;)this._consumeAttribute();if(this._attemptCharCodeUntilFn(T$1),this._openDirectiveCount--,this._cursor.peek()!==41){if(this._cursor.peek()===62||this._cursor.peek()===47)return;throw this._createError(be$1(this._cursor.peek()),this._cursor.getSpan(e))}this._beginToken(l.DIRECTIVE_CLOSE),this._cursor.advance(),this._endToken([]),this._attemptCharCodeUntilFn(T$1);}}_getProcessedChars(e,t){return this._processCarriageReturns(t.getChars(e))}_isTextEnd(){return !!(this._isTagStart()||this._cursor.peek()===0||this._tokenizeIcu&&!this._inInterpolation&&(this.isExpansionFormStart()||this._cursor.peek()===125&&this._isInExpansionCase())||this._tokenizeBlocks&&!this._inInterpolation&&!this._isInExpansion()&&(this._isBlockStart()||this._isLetStart()||this._cursor.peek()===125))}_isTagStart(){if(this._cursor.peek()===60){let e=this._cursor.clone();e.advance();let t=e.peek();if(97<=t&&t<=122||65<=t&&t<=90||t===47||t===33)return  true}return  false}_readUntil(e){let t=this._cursor.clone();return this._attemptUntilChar(e),this._cursor.getChars(t)}_isInExpansion(){return this._isInExpansionCase()||this._isInExpansionForm()}_isInExpansionCase(){return this._expansionCaseStack.length>0&&this._expansionCaseStack[this._expansionCaseStack.length-1]===l.EXPANSION_CASE_EXP_START}_isInExpansionForm(){return this._expansionCaseStack.length>0&&this._expansionCaseStack[this._expansionCaseStack.length-1]===l.EXPANSION_FORM_START}isExpansionFormStart(){if(this._cursor.peek()!==123)return  false;let e=this._cursor.clone(),t=this._attemptStr(ft$1.start);return this._cursor=e,!t}_handleFullNameStackForTagOpen(e,t){let r=Ee$1(e,t);(this._fullNameStack.length===0||this._fullNameStack[this._fullNameStack.length-1]===r)&&this._fullNameStack.push(r);}_handleFullNameStackForTagClose(e,t){let r=Ee$1(e,t);this._fullNameStack.length!==0&&this._fullNameStack[this._fullNameStack.length-1]===r&&this._fullNameStack.pop();}};function T$1(e){return !ct$1(e)||e===0}function we$1(e){return ct$1(e)||e===62||e===60||e===47||e===39||e===34||e===61||e===0}function Ro$1(e){return (e<97||122<e)&&(e<65||90<e)&&(e<48||e>57)}function Mo$1(e){return e===59||e===0||!Bi(e)}function Bo$1(e){return e===59||e===0||!Fe$1(e)}function Fo$1(e){return e!==125}function qo$1(e,t){return Ji(e)===Ji(t)}function Ji(e){return e>=97&&e<=122?e-97+65:e}function Ho$1(e){return Fe$1(e)||ut$1(e)||e===95}function Zi(e){return e!==59&&T$1(e)}function zt$1(e){return e===95||e>=65&&e<=90}function es(e){return Fe$1(e)||ut$1(e)||e===95}function ts(e){return e===47||e===62||e===60||e===0}function Vo$1(e){let t=[],r;for(let n=0;n<e.length;n++){let i=e[n];r&&r.type===l.TEXT&&i.type===l.TEXT||r&&r.type===l.ATTR_VALUE_TEXT&&i.type===l.ATTR_VALUE_TEXT?(r.parts[0]+=i.parts[0],r.sourceSpan.end=i.sourceSpan.end):(r=i,t.push(r));}return t}var is=class Br{constructor(t,r){if(t instanceof Br){this.file=t.file,this.input=t.input,this.end=t.end;let n=t.state;this.state={peek:n.peek,offset:n.offset,line:n.line,column:n.column};}else {if(!r)throw new Error("Programming error: the range argument must be provided with a file argument.");this.file=t,this.input=t.content,this.end=r.endPos,this.state={peek:-1,offset:r.startPos,line:r.startLine,column:r.startCol};}}clone(){return new Br(this)}peek(){return this.state.peek}charsLeft(){return this.end-this.state.offset}diff(t){return this.state.offset-t.state.offset}advance(){this.advanceState(this.state);}init(){this.updatePeek(this.state);}getSpan(t,r){t=t||this;let n=t;if(r)for(;this.diff(t)>0&&r.indexOf(t.peek())!==-1;)n===t&&(t=t.clone()),t.advance();let i=this.locationFromCursor(t);return new h(i,this.locationFromCursor(this),n!==t?this.locationFromCursor(n):i)}getChars(t){return this.input.substring(t.state.offset,this.state.offset)}charAt(t){return this.input.charCodeAt(t)}advanceState(t){if(t.offset>=this.end)throw this.state=t,new Vr$1('Unexpected character "EOF"',this);let r=this.charAt(t.offset);r===10?(t.line++,t.column=0):pt$1(r)||t.column++,t.offset++,this.updatePeek(t);}updatePeek(t){t.peek=t.offset>=this.end?0:this.charAt(t.offset);}locationFromCursor(t){return new qe$1(t.file,t.state.offset,t.state.line,t.state.column)}},Uo$1=class Fr extends is{constructor(t,r){t instanceof Fr?(super(t),this.internalState={...t.internalState}):(super(t,r),this.internalState=this.state);}advance(){this.state=this.internalState,super.advance(),this.processEscapeSequence();}init(){super.init(),this.processEscapeSequence();}clone(){return new Fr(this)}getChars(t){let r=t.clone(),n="";for(;r.internalState.offset<this.internalState.offset;)n+=String.fromCodePoint(r.peek()),r.advance();return n}processEscapeSequence(){let t=()=>this.internalState.peek;if(t()===92)if(this.internalState={...this.state},this.advanceState(this.internalState),t()===110)this.state.peek=10;else if(t()===114)this.state.peek=13;else if(t()===118)this.state.peek=11;else if(t()===116)this.state.peek=9;else if(t()===98)this.state.peek=8;else if(t()===102)this.state.peek=12;else if(t()===117)if(this.advanceState(this.internalState),t()===123){this.advanceState(this.internalState);let r=this.clone(),n=0;for(;t()!==125;)this.advanceState(this.internalState),n++;this.state.peek=this.decodeHexDigits(r,n);}else {let r=this.clone();this.advanceState(this.internalState),this.advanceState(this.internalState),this.advanceState(this.internalState),this.state.peek=this.decodeHexDigits(r,4);}else if(t()===120){this.advanceState(this.internalState);let r=this.clone();this.advanceState(this.internalState),this.state.peek=this.decodeHexDigits(r,2);}else if(yr$1(t())){let r="",n=0,i=this.clone();for(;yr$1(t())&&n<3;)i=this.clone(),r+=String.fromCodePoint(t()),this.advanceState(this.internalState),n++;this.state.peek=parseInt(r,8),this.internalState=i.internalState;}else pt$1(this.internalState.peek)?(this.advanceState(this.internalState),this.state=this.internalState):this.state.peek=this.internalState.peek;}decodeHexDigits(t,r){let n=this.input.slice(t.internalState.offset,t.internalState.offset+r),i=parseInt(n,16);if(isNaN(i))throw t.state=t.internalState,new Vr$1("Invalid hexadecimal escape sequence",t);return i}},Vr$1=class Vr extends Error{constructor(e,t){super(e),this.msg=e,this.cursor=t,Object.setPrototypeOf(this,new.target.prototype);}};var N=class os extends ne{static create(t,r,n){return new os(t,r,n)}constructor(t,r,n){super(r,n),this.elementName=t;}},Wo$1=class Wo{constructor(e,t){this.rootNodes=e,this.errors=t;}},ls=class{constructor(e){this.getTagDefinition=e;}parse(e,t,r,n=false,i){let s=m=>(g,...E)=>m(g.toLowerCase(),...E),a=n?this.getTagDefinition:s(this.getTagDefinition),o=m=>a(m).getContentType(),c=n?i:s(i),u=ns(e,t,i?(m,g,E,P)=>{let z=c(m,g,E,P);return z!==void 0?z:o(m)}:o,r),p=r&&r.canSelfClose||false,d=r&&r.allowHtmComponentClosingTags||false,S=new Go$1(u.tokens,a,p,d,n);return S.build(),new Wo$1(S.rootNodes,[...u.errors,...S.errors])}},Go$1=class cs{constructor(t,r,n,i,s){this.tokens=t,this.tagDefinitionResolver=r,this.canSelfClose=n,this.allowHtmComponentClosingTags=i,this.isTagNameCaseSensitive=s,this._index=-1,this._containerStack=[],this.rootNodes=[],this.errors=[],this._advance();}build(){for(;this._peek.type!==l.EOF;)this._peek.type===l.TAG_OPEN_START||this._peek.type===l.INCOMPLETE_TAG_OPEN?this._consumeElementStartTag(this._advance()):this._peek.type===l.TAG_CLOSE?(this._closeVoidElement(),this._consumeElementEndTag(this._advance())):this._peek.type===l.CDATA_START?(this._closeVoidElement(),this._consumeCdata(this._advance())):this._peek.type===l.COMMENT_START?(this._closeVoidElement(),this._consumeComment(this._advance())):this._peek.type===l.TEXT||this._peek.type===l.RAW_TEXT||this._peek.type===l.ESCAPABLE_RAW_TEXT?(this._closeVoidElement(),this._consumeText(this._advance())):this._peek.type===l.EXPANSION_FORM_START?this._consumeExpansion(this._advance()):this._peek.type===l.BLOCK_OPEN_START?(this._closeVoidElement(),this._consumeBlockOpen(this._advance())):this._peek.type===l.BLOCK_CLOSE?(this._closeVoidElement(),this._consumeBlockClose(this._advance())):this._peek.type===l.INCOMPLETE_BLOCK_OPEN?(this._closeVoidElement(),this._consumeIncompleteBlock(this._advance())):this._peek.type===l.LET_START?(this._closeVoidElement(),this._consumeLet(this._advance())):this._peek.type===l.DOC_TYPE_START?this._consumeDocType(this._advance()):this._peek.type===l.INCOMPLETE_LET?(this._closeVoidElement(),this._consumeIncompleteLet(this._advance())):this._peek.type===l.COMPONENT_OPEN_START||this._peek.type===l.INCOMPLETE_COMPONENT_OPEN?this._consumeComponentStartTag(this._advance()):this._peek.type===l.COMPONENT_CLOSE?this._consumeComponentEndTag(this._advance()):this._advance();for(let t of this._containerStack)t instanceof ve$1&&this.errors.push(N.create(t.name,t.sourceSpan,`Unclosed block "${t.name}"`));}_advance(){let t=this._peek;return this._index<this.tokens.length-1&&this._index++,this._peek=this.tokens[this._index],t}_advanceIf(t){return this._peek.type===t?this._advance():null}_consumeCdata(t){let r=this._advance(),n=this._getText(r),i=this._advanceIf(l.CDATA_END);this._addToParent(new Vi(n,new h(t.sourceSpan.start,(i||r).sourceSpan.end),[r]));}_consumeComment(t){let r=this._advanceIf(l.RAW_TEXT),n=this._advanceIf(l.COMMENT_END),i=r!=null?r.parts[0].trim():null,s=n==null?t.sourceSpan:new h(t.sourceSpan.start,n.sourceSpan.end,t.sourceSpan.fullStart);this._addToParent(new $i(i,s));}_consumeDocType(t){let r=this._advanceIf(l.RAW_TEXT),n=this._advanceIf(l.DOC_TYPE_END),i=r!=null?r.parts[0].trim():null,s=new h(t.sourceSpan.start,(n||r||t).sourceSpan.end);this._addToParent(new zi(i,s));}_consumeExpansion(t){let r=this._advance(),n=this._advance(),i=[];for(;this._peek.type===l.EXPANSION_CASE_VALUE;){let a=this._parseExpansionCase();if(!a)return;i.push(a);}if(this._peek.type!==l.EXPANSION_FORM_END){this.errors.push(N.create(null,this._peek.sourceSpan,"Invalid ICU message. Missing '}'."));return}let s=new h(t.sourceSpan.start,this._peek.sourceSpan.end,t.sourceSpan.fullStart);this._addToParent(new Ui(r.parts[0],n.parts[0],i,s,r.sourceSpan)),this._advance();}_parseExpansionCase(){let t=this._advance();if(this._peek.type!==l.EXPANSION_CASE_EXP_START)return this.errors.push(N.create(null,this._peek.sourceSpan,"Invalid ICU message. Missing '{'.")),null;let r=this._advance(),n=this._collectExpansionExpTokens(r);if(!n)return null;let i=this._advance();n.push({type:l.EOF,parts:[],sourceSpan:i.sourceSpan});let s=new cs(n,this.tagDefinitionResolver,this.canSelfClose,this.allowHtmComponentClosingTags,this.isTagNameCaseSensitive);if(s.build(),s.errors.length>0)return this.errors=this.errors.concat(s.errors),null;let a=new h(t.sourceSpan.start,i.sourceSpan.end,t.sourceSpan.fullStart),o=new h(r.sourceSpan.start,i.sourceSpan.end,r.sourceSpan.fullStart);return new Wi(t.parts[0],s.rootNodes,a,t.sourceSpan,o)}_collectExpansionExpTokens(t){let r=[],n=[l.EXPANSION_CASE_EXP_START];for(;;){if((this._peek.type===l.EXPANSION_FORM_START||this._peek.type===l.EXPANSION_CASE_EXP_START)&&n.push(this._peek.type),this._peek.type===l.EXPANSION_CASE_EXP_END)if(ss(n,l.EXPANSION_CASE_EXP_START)){if(n.pop(),n.length===0)return r}else return this.errors.push(N.create(null,t.sourceSpan,"Invalid ICU message. Missing '}'.")),null;if(this._peek.type===l.EXPANSION_FORM_END)if(ss(n,l.EXPANSION_FORM_START))n.pop();else return this.errors.push(N.create(null,t.sourceSpan,"Invalid ICU message. Missing '}'.")),null;if(this._peek.type===l.EOF)return this.errors.push(N.create(null,t.sourceSpan,"Invalid ICU message. Missing '}'.")),null;r.push(this._advance());}}_getText(t){let r=t.parts[0];if(r.length>0&&r[0]==`
`){var n;let i=this._getClosestElementLikeParent();i!=null&&i.children.length==0&&(!((n=this._getTagDefinition(i))===null||n===void 0)&&n.ignoreFirstLf)&&(r=r.substring(1));}return r}_consumeText(t){let r=[t],n=t.sourceSpan,i=t.parts[0];if(i.length>0&&i[0]===`
`){var s;let a=this._getContainer();a!=null&&a.children.length===0&&(!((s=this._getTagDefinition(a))===null||s===void 0)&&s.ignoreFirstLf)&&(i=i.substring(1),r[0]={type:t.type,sourceSpan:t.sourceSpan,parts:[i]});}for(;this._peek.type===l.INTERPOLATION||this._peek.type===l.TEXT||this._peek.type===l.ENCODED_ENTITY;)t=this._advance(),r.push(t),t.type===l.INTERPOLATION?i+=t.parts.join("").replace(/&([^;]+);/g,as):t.type===l.ENCODED_ENTITY?i+=t.parts[0]:i+=t.parts.join("");if(i.length>0){let a=t.sourceSpan;this._addToParent(new Hi(i,new h(n.start,a.end,n.fullStart,n.details),r));}}_closeVoidElement(){var t;let r=this._getContainer();r!==null&&(!((t=this._getTagDefinition(r))===null||t===void 0)&&t.isVoid)&&this._containerStack.pop();}_consumeElementStartTag(t){var r;let n=[],i=[];this._consumeAttributesAndDirectives(n,i);let s=this._getElementFullName(t,this._getClosestElementLikeParent()),a=this._getTagDefinition(s),o=false;if(this._peek.type===l.TAG_OPEN_END_VOID){this._advance(),o=true;let E=this._getTagDefinition(s);this.canSelfClose||E?.canSelfClose||Me$1(s)!==null||E?.isVoid||this.errors.push(N.create(s,t.sourceSpan,`Only void, custom and foreign elements can be self closed "${t.parts[1]}"`));}else this._peek.type===l.TAG_OPEN_END&&(this._advance(),o=false);let c=this._peek.sourceSpan.fullStart,u=new h(t.sourceSpan.start,c,t.sourceSpan.fullStart),p=new h(t.sourceSpan.start,c,t.sourceSpan.fullStart),d=new h(t.sourceSpan.start.moveBy(1),t.sourceSpan.end),S=new ie$1(s,n,i,[],o,u,p,void 0,d,a?.isVoid??false),m=this._getContainer(),g=m!==null&&!!(!((r=this._getTagDefinition(m))===null||r===void 0)&&r.isClosedByChild(S.name));this._pushContainer(S,g),o?this._popContainer(s,ie$1,u):t.type===l.INCOMPLETE_TAG_OPEN&&(this._popContainer(s,ie$1,null),this.errors.push(N.create(s,u,`Opening tag "${s}" not terminated.`)));}_consumeComponentStartTag(t){var r;let n=t.parts[0],i=[],s=[];this._consumeAttributesAndDirectives(i,s);let a=this._getClosestElementLikeParent(),o=this._getComponentTagName(t,a),c=this._getComponentFullName(t,a),u=this._peek.type===l.COMPONENT_OPEN_END_VOID;this._advance();let p=this._peek.sourceSpan.fullStart,d=new h(t.sourceSpan.start,p,t.sourceSpan.fullStart),S=new h(t.sourceSpan.start,p,t.sourceSpan.fullStart),m=new J(n,o,c,i,s,[],u,d,S,void 0),g=this._getContainer(),E=g!==null&&m.tagName!==null&&!!(!((r=this._getTagDefinition(g))===null||r===void 0)&&r.isClosedByChild(m.tagName));this._pushContainer(m,E),u?this._popContainer(c,J,d):t.type===l.INCOMPLETE_COMPONENT_OPEN&&(this._popContainer(c,J,null),this.errors.push(N.create(c,d,`Opening tag "${c}" not terminated.`)));}_consumeAttributesAndDirectives(t,r){for(;this._peek.type===l.ATTR_NAME||this._peek.type===l.DIRECTIVE_NAME;)this._peek.type===l.DIRECTIVE_NAME?r.push(this._consumeDirective(this._peek)):t.push(this._consumeAttr(this._advance()));}_consumeComponentEndTag(t){let r=this._getComponentFullName(t,this._getClosestElementLikeParent());if(!this._popContainer(r,J,t.sourceSpan)){let n=this._containerStack[this._containerStack.length-1],i;n instanceof J&&n.componentName===t.parts[0]?i=`, did you mean "${n.fullName}"?`:i=". It may happen when the tag has already been closed by another tag.";let s=`Unexpected closing tag "${r}"${i}`;this.errors.push(N.create(r,t.sourceSpan,s));}}_getTagDefinition(t){return typeof t=="string"?this.tagDefinitionResolver(t):t instanceof ie$1?this.tagDefinitionResolver(t.name):t instanceof J&&t.tagName!==null?this.tagDefinitionResolver(t.tagName):null}_pushContainer(t,r){r&&this._containerStack.pop(),this._addToParent(t),this._containerStack.push(t);}_consumeElementEndTag(t){var r;let n=this.allowHtmComponentClosingTags&&t.parts.length===0?null:this._getElementFullName(t,this._getClosestElementLikeParent());if(n&&(!((r=this._getTagDefinition(n))===null||r===void 0)&&r.isVoid))this.errors.push(N.create(n,t.sourceSpan,`Void elements do not have end tags "${t.parts[1]}"`));else if(!this._popContainer(n,ie$1,t.sourceSpan)){let i=`Unexpected closing tag "${n}". It may happen when the tag has already been closed by another tag. For more info see https://www.w3.org/TR/html5/syntax.html#closing-elements-that-have-implied-end-tags`;this.errors.push(N.create(n,t.sourceSpan,i));}}_popContainer(t,r,n){let i=false;for(let a=this._containerStack.length-1;a>=0;a--){var s;let o=this._containerStack[a],c=o instanceof J?o.fullName:o.name;if(Me$1(c)?c===t:(c===t||t===null)&&o instanceof r)return o.endSourceSpan=n,o.sourceSpan.end=n!==null?n.end:o.sourceSpan.end,this._containerStack.splice(a,this._containerStack.length-a),!i;(o instanceof ve$1||!(!((s=this._getTagDefinition(o))===null||s===void 0)&&s.closedByParent))&&(i=true);}return  false}_consumeAttr(t){let r=Ee$1(t.parts[0],t.parts[1]),n=t.sourceSpan.end,i;this._peek.type===l.ATTR_QUOTE&&(i=this._advance());let s="",a=[],o,c;if(this._peek.type===l.ATTR_VALUE_TEXT)for(o=this._peek.sourceSpan,c=this._peek.sourceSpan.end;this._peek.type===l.ATTR_VALUE_TEXT||this._peek.type===l.ATTR_VALUE_INTERPOLATION||this._peek.type===l.ENCODED_ENTITY;){let p=this._advance();a.push(p),p.type===l.ATTR_VALUE_INTERPOLATION?s+=p.parts.join("").replace(/&([^;]+);/g,as):p.type===l.ENCODED_ENTITY?s+=p.parts[0]:s+=p.parts.join(""),c=n=p.sourceSpan.end;}this._peek.type===l.ATTR_QUOTE&&(c=n=this._advance().sourceSpan.end);let u=o&&c&&new h(i?.sourceSpan.start??o.start,c,i?.sourceSpan.fullStart??o.fullStart);return new Gi(r,s,new h(t.sourceSpan.start,n,t.sourceSpan.fullStart),t.sourceSpan,u,a.length>0?a:void 0,void 0)}_consumeDirective(t){let r=[],n=t.sourceSpan.end,i=null;if(this._advance(),this._peek.type===l.DIRECTIVE_OPEN){for(n=this._peek.sourceSpan.end,this._advance();this._peek.type===l.ATTR_NAME;)r.push(this._consumeAttr(this._advance()));this._peek.type===l.DIRECTIVE_CLOSE?(i=this._peek.sourceSpan,this._advance()):this.errors.push(N.create(null,t.sourceSpan,"Unterminated directive definition"));}let s=new h(t.sourceSpan.start,n,t.sourceSpan.fullStart),a=new h(s.start,i===null?t.sourceSpan.end:i.end,s.fullStart);return new Yi(t.parts[0],r,a,s,i)}_consumeBlockOpen(t){let r=[];for(;this._peek.type===l.BLOCK_PARAMETER;){let o=this._advance();r.push(new Nr(o.parts[0],o.sourceSpan));}this._peek.type===l.BLOCK_OPEN_END&&this._advance();let n=this._peek.sourceSpan.fullStart,i=new h(t.sourceSpan.start,n,t.sourceSpan.fullStart),s=new h(t.sourceSpan.start,n,t.sourceSpan.fullStart),a=new ve$1(t.parts[0],r,[],i,t.sourceSpan,s);this._pushContainer(a,false);}_consumeBlockClose(t){this._popContainer(null,ve$1,t.sourceSpan)||this.errors.push(N.create(null,t.sourceSpan,'Unexpected closing block. The block may have been closed earlier. If you meant to write the } character, you should use the "&#125;" HTML entity instead.'));}_consumeIncompleteBlock(t){let r=[];for(;this._peek.type===l.BLOCK_PARAMETER;){let o=this._advance();r.push(new Nr(o.parts[0],o.sourceSpan));}let n=this._peek.sourceSpan.fullStart,i=new h(t.sourceSpan.start,n,t.sourceSpan.fullStart),s=new h(t.sourceSpan.start,n,t.sourceSpan.fullStart),a=new ve$1(t.parts[0],r,[],i,t.sourceSpan,s);this._pushContainer(a,false),this._popContainer(null,ve$1,null),this.errors.push(N.create(t.parts[0],i,`Incomplete block "${t.parts[0]}". If you meant to write the @ character, you should use the "&#64;" HTML entity instead.`));}_consumeLet(t){let r=t.parts[0],n,i;if(this._peek.type!==l.LET_VALUE){this.errors.push(N.create(t.parts[0],t.sourceSpan,`Invalid @let declaration "${r}". Declaration must have a value.`));return}else n=this._advance();if(this._peek.type!==l.LET_END){this.errors.push(N.create(t.parts[0],t.sourceSpan,`Unterminated @let declaration "${r}". Declaration must be terminated with a semicolon.`));return}else i=this._advance();let s=i.sourceSpan.fullStart,a=new h(t.sourceSpan.start,s,t.sourceSpan.fullStart),o=t.sourceSpan.toString().lastIndexOf(r),c=new h(t.sourceSpan.start.moveBy(o),t.sourceSpan.end),u=new Lr$1(r,n.parts[0],a,c,n.sourceSpan);this._addToParent(u);}_consumeIncompleteLet(t){let r=t.parts[0]??"",n=r?` "${r}"`:"";if(r.length>0){let i=t.sourceSpan.toString().lastIndexOf(r),s=new h(t.sourceSpan.start.moveBy(i),t.sourceSpan.end),a=new h(t.sourceSpan.start,t.sourceSpan.start.moveBy(0)),o=new Lr$1(r,"",t.sourceSpan,s,a);this._addToParent(o);}this.errors.push(N.create(t.parts[0],t.sourceSpan,`Incomplete @let declaration${n}. @let declarations must be written as \`@let <name> = <value>;\``));}_getContainer(){return this._containerStack.length>0?this._containerStack[this._containerStack.length-1]:null}_getClosestElementLikeParent(){for(let t=this._containerStack.length-1;t>-1;t--){let r=this._containerStack[t];if(r instanceof ie$1||r instanceof J)return r}return null}_addToParent(t){let r=this._getContainer();r===null?this.rootNodes.push(t):r.children.push(t);}_getElementFullName(t,r){return Ee$1(this._getPrefix(t,r),t.parts[1])}_getComponentFullName(t,r){let n=t.parts[0],i=this._getComponentTagName(t,r);return i===null?n:i.startsWith(":")?n+i:`${n}:${i}`}_getComponentTagName(t,r){let n=this._getPrefix(t,r),i=t.parts[2];return !n&&!i?null:!n&&i?i:Ee$1(n,i||"ng-component")}_getPrefix(t,r){var n;let i,s;if(t.type===l.COMPONENT_OPEN_START||t.type===l.INCOMPLETE_COMPONENT_OPEN||t.type===l.COMPONENT_CLOSE?(i=t.parts[1],s=t.parts[2]):(i=t.parts[0],s=t.parts[1]),i=i||((n=this._getTagDefinition(s))===null||n===void 0?void 0:n.implicitNamespacePrefix)||"",!i&&r){let a=r instanceof ie$1?r.name:r.tagName;if(a!==null){let o=at$1(a)[1],c=this._getTagDefinition(o);c!==null&&!c.preventNamespaceInheritance&&(i=Me$1(a));}}return i}};function ss(e,t){return e.length>0&&e[e.length-1]===t}function as(e,t){return Te[t]!==void 0?Te[t]||e:/^#x[a-f0-9]+$/i.test(t)?String.fromCodePoint(parseInt(t.slice(2),16)):/^#\d+$/.test(t)?String.fromCodePoint(parseInt(t.slice(1),10)):e}var us=class extends ls{constructor(){super(Be$1);}parse(e,t,r,n=false,i){return super.parse(e,t,r,n,i)}};var Ur$1=null,$o$1=()=>(Ur$1||(Ur$1=new us),Ur$1);function Qt$1(e,t={}){let{canSelfClose:r=false,allowHtmComponentClosingTags:n=false,isTagNameCaseSensitive:i=false,getTagContentType:s,tokenizeAngularBlocks:a=false,tokenizeAngularLetDeclaration:o=false,enableAngularSelectorlessSyntax:c=false}=t;return $o$1().parse(e,"angular-html-parser",{tokenizeExpansionForms:a,canSelfClose:r,allowHtmComponentClosingTags:n,tokenizeBlocks:a,tokenizeLet:o,selectorlessEnabled:c},i,s)}var zo$1=[jo$1,Xo$1,Qo$1,Zo$1,el,nl,tl,rl,il,Jo$1];function Yo$1(e,t){for(let r of zo$1)r(e,t);return e}function jo$1(e){e.walk(t=>{if(t.kind==="element"&&t.tagDefinition.ignoreFirstLf&&t.children.length>0&&t.children[0].kind==="text"&&t.children[0].value[0]===`
`){let r=t.children[0];r.value.length===1?t.removeChild(r):r.value=r.value.slice(1);}});}function Xo$1(e){let t=r=>r.kind==="element"&&r.prev?.kind==="ieConditionalStartComment"&&r.prev.sourceSpan.end.offset===r.startSourceSpan.start.offset&&r.firstChild?.kind==="ieConditionalEndComment"&&r.firstChild.sourceSpan.start.offset===r.startSourceSpan.end.offset;e.walk(r=>{if(r.children)for(let n=0;n<r.children.length;n++){let i=r.children[n];if(!t(i))continue;let s=i.prev,a=i.firstChild;r.removeChild(s),n--;let o=new h(s.sourceSpan.start,a.sourceSpan.end),c=new h(o.start,i.sourceSpan.end);i.condition=s.condition,i.sourceSpan=c,i.startSourceSpan=o,i.removeChild(a);}});}function Ko$1(e,t,r){e.walk(n=>{if(n.children)for(let i=0;i<n.children.length;i++){let s=n.children[i];if(s.kind!=="text"&&!t(s))continue;s.kind!=="text"&&(s.kind="text",s.value=r(s));let a=s.prev;!a||a.kind!=="text"||(a.value+=s.value,a.sourceSpan=new h(a.sourceSpan.start,s.sourceSpan.end),n.removeChild(s),i--);}});}function Qo$1(e){return Ko$1(e,t=>t.kind==="cdata",t=>`<![CDATA[${t.value}]]>`)}function Jo$1(e){let t=r=>r.kind==="element"&&r.attrs.length===0&&r.children.length===1&&r.firstChild.kind==="text"&&!y.hasWhitespaceCharacter(r.children[0].value)&&!r.firstChild.hasLeadingSpaces&&!r.firstChild.hasTrailingSpaces&&r.isLeadingSpaceSensitive&&!r.hasLeadingSpaces&&r.isTrailingSpaceSensitive&&!r.hasTrailingSpaces&&r.prev?.kind==="text"&&r.next?.kind==="text";e.walk(r=>{if(r.children)for(let n=0;n<r.children.length;n++){let i=r.children[n];if(!t(i))continue;let s=i.prev,a=i.next;s.value+=`<${i.rawName}>`+i.firstChild.value+`</${i.rawName}>`+a.value,s.sourceSpan=new h(s.sourceSpan.start,a.sourceSpan.end),s.isTrailingSpaceSensitive=a.isTrailingSpaceSensitive,s.hasTrailingSpaces=a.hasTrailingSpaces,r.removeChild(i),n--,r.removeChild(a);}});}function Zo$1(e,t){if(t.parser==="html")return;let r=/\{\{(.+?)\}\}/su;e.walk(n=>{if(xn$1(n,t))for(let i of n.children){if(i.kind!=="text")continue;let s=i.sourceSpan.start,a=null,o=i.value.split(r);for(let c=0;c<o.length;c++,s=a){let u=o[c];if(c%2===0){a=s.moveBy(u.length),u.length>0&&n.insertChildBefore(i,{kind:"text",value:u,sourceSpan:new h(s,a)});continue}a=s.moveBy(u.length+4),n.insertChildBefore(i,{kind:"interpolation",sourceSpan:new h(s,a),children:u.length===0?[]:[{kind:"text",value:u,sourceSpan:new h(s.moveBy(2),a.moveBy(-2))}]});}n.removeChild(i);}});}function el(e,t){e.walk(r=>{let n=r.$children;if(!n)return;if(n.length===0||n.length===1&&n[0].kind==="text"&&y.trim(n[0].value).length===0){r.hasDanglingSpaces=n.length>0,r.$children=[];return}let i=An$1(r,t),s=dr$1(r);if(!i)for(let a=0;a<n.length;a++){let o=n[a];if(o.kind!=="text")continue;let{leadingWhitespace:c,text:u,trailingWhitespace:p}=kn$1(o.value),d=o.prev,S=o.next;u?(o.value=u,o.sourceSpan=new h(o.sourceSpan.start.moveBy(c.length),o.sourceSpan.end.moveBy(-p.length)),c&&(d&&(d.hasTrailingSpaces=true),o.hasLeadingSpaces=true),p&&(o.hasTrailingSpaces=true,S&&(S.hasLeadingSpaces=true))):(r.removeChild(o),a--,(c||p)&&(d&&(d.hasTrailingSpaces=true),S&&(S.hasLeadingSpaces=true)));}r.isWhitespaceSensitive=i,r.isIndentationSensitive=s;});}function tl(e){e.walk(t=>{t.isSelfClosing=!t.children||t.kind==="element"&&(t.tagDefinition.isVoid||t.endSourceSpan&&t.startSourceSpan.start===t.endSourceSpan.start&&t.startSourceSpan.end===t.endSourceSpan.end);});}function rl(e,t){e.walk(r=>{r.kind==="element"&&(r.hasHtmComponentClosingTag=r.endSourceSpan&&/^<\s*\/\s*\/\s*>$/u.test(t.originalText.slice(r.endSourceSpan.start.offset,r.endSourceSpan.end.offset)));});}function nl(e,t){e.walk(r=>{r.cssDisplay=Bn$1(r,t);});}function il(e,t){e.walk(r=>{let{children:n}=r;if(n){if(n.length===0){r.isDanglingSpaceSensitive=Ln$1(r,t);return}for(let i of n)i.isLeadingSpaceSensitive=yn$1(i,t),i.isTrailingSpaceSensitive=Nn$1(i,t);for(let i=0;i<n.length;i++){let s=n[i];s.isLeadingSpaceSensitive=(i===0||s.prev.isTrailingSpaceSensitive)&&s.isLeadingSpaceSensitive,s.isTrailingSpaceSensitive=(i===n.length-1||s.next.isLeadingSpaceSensitive)&&s.isTrailingSpaceSensitive;}}});}var ps=Yo$1;function sl(e,t,r){let{node:n}=e;switch(n.kind){case "root":return t.__onHtmlRoot&&t.__onHtmlRoot(n),[C(Re$1(e,t,r)),v$1];case "element":case "ieConditionalComment":return Pi(e,t,r);case "angularControlFlowBlock":return xi(e,t,r);case "angularControlFlowBlockParameters":return yi(e,t,r);case "angularControlFlowBlockParameter":return y.trim(n.expression);case "angularLetDeclaration":return C(["@let ",C([n.id," =",C(A([_$1,r("init")]))]),";"]);case "angularLetDeclarationInitializer":return n.value;case "angularIcuExpression":return Ni(e,t,r);case "angularIcuCase":return Li(e,t,r);case "ieConditionalStartComment":case "ieConditionalEndComment":return [Se$1(n),fe$1(n)];case "interpolation":return [Se$1(n,t),...e.map(r,"children"),fe$1(n,t)];case "text":{if(n.parent.kind==="interpolation"){let o=/\n[^\S\n]*$/u,c=o.test(n.value),u=c?n.value.replace(o,""):n.value;return [L$1(u),c?v$1:""]}let i=U$1(n,t),s=Dt$1(n),a=V$1(n,t);return s[0]=[i,s[0]],s.push([s.pop(),a]),xt(s)}case "docType":return [C([Se$1(n,t)," ",w$1(0,n.value.replace(/^html\b/iu,"html"),/\s+/gu," ")]),fe$1(n,t)];case "comment":return [U$1(n,t),L$1(t.originalText.slice(Q(n),te$1(n))),V$1(n,t)];case "attribute":{if(n.value===null)return n.rawName;let i=Sr$1(n.value),s=Rt(n,t)?"":pn(i,'"');return [n.rawName,"=",s,L$1(s==='"'?w$1(0,i,'"',"&quot;"):w$1(0,i,"'","&apos;")),s]}case "frontMatter":case "cdata":default:throw new mn$1(n,"HTML")}}var al={features:{experimental_frontMatterSupport:{massageAstNode:true,embed:true,print:true}},preprocess:ps,print:sl,insertPragma:bi,massageAstNode:dn$1,embed:fi$1,getVisitorKeys:_i},hs=al;var ms=[{name:"Angular",type:"markup",aceMode:"html",extensions:[".component.html"],tmScope:"text.html.basic",aliases:["xhtml"],codemirrorMode:"htmlmixed",codemirrorMimeType:"text/html",parsers:["angular"],vscodeLanguageIds:["html"],filenames:[],linguistLanguageId:146},{name:"HTML",type:"markup",aceMode:"html",extensions:[".html",".hta",".htm",".html.hl",".inc",".xht",".xhtml"],tmScope:"text.html.basic",aliases:["xhtml"],codemirrorMode:"htmlmixed",codemirrorMimeType:"text/html",parsers:["html"],vscodeLanguageIds:["html"],linguistLanguageId:146},{name:"Lightning Web Components",type:"markup",aceMode:"html",extensions:[],tmScope:"text.html.basic",aliases:["xhtml"],codemirrorMode:"htmlmixed",codemirrorMimeType:"text/html",parsers:["lwc"],vscodeLanguageIds:["html"],filenames:[],linguistLanguageId:146},{name:"MJML",type:"markup",aceMode:"html",extensions:[".mjml"],tmScope:"text.mjml.basic",aliases:["MJML","mjml"],codemirrorMode:"htmlmixed",codemirrorMimeType:"text/html",parsers:["mjml"],filenames:[],vscodeLanguageIds:["mjml"],linguistLanguageId:146},{name:"Vue",type:"markup",aceMode:"vue",extensions:[".vue"],tmScope:"source.vue",codemirrorMode:"vue",codemirrorMimeType:"text/x-vue",parsers:["vue"],vscodeLanguageIds:["vue"],linguistLanguageId:391}];var Wr$1={bracketSameLine:{category:"Common",type:"boolean",default:false,description:"Put > of opening tags on the last line instead of on a new line."},singleAttributePerLine:{category:"Common",type:"boolean",default:false,description:"Enforce single attribute per line in HTML, Vue and JSX."}};var fs="HTML",ol={bracketSameLine:Wr$1.bracketSameLine,htmlWhitespaceSensitivity:{category:fs,type:"choice",default:"css",description:"How to handle whitespaces in HTML.",choices:[{value:"css",description:"Respect the default value of CSS display property."},{value:"strict",description:"Whitespaces are considered sensitive."},{value:"ignore",description:"Whitespaces are considered insensitive."}]},singleAttributePerLine:Wr$1.singleAttributePerLine,vueIndentScriptAndStyle:{category:fs,type:"boolean",default:false,description:"Indent script and style tags in Vue files."}},ds=ol;var Qr$1={};en$1(Qr$1,{angular:()=>Al,html:()=>wl,lwc:()=>Nl,mjml:()=>xl,vue:()=>yl});function ll(e,t){let r=new SyntaxError(e+" ("+t.loc.start.line+":"+t.loc.start.column+")");return Object.assign(r,t)}var gs=ll;var cl={canSelfClose:true,normalizeTagName:false,normalizeAttributeName:false,allowHtmComponentClosingTags:false,isTagNameCaseSensitive:false,shouldParseFrontMatter:true};function Jt$1(e){return {...cl,...e}}function Gr$1(e){let{canSelfClose:t,allowHtmComponentClosingTags:r,isTagNameCaseSensitive:n,shouldParseAsRawText:i,tokenizeAngularBlocks:s,tokenizeAngularLetDeclaration:a}=e;return {canSelfClose:t,allowHtmComponentClosingTags:r,isTagNameCaseSensitive:n,getTagContentType:i?(...o)=>i(...o)?R$1.RAW_TEXT:void 0:void 0,tokenizeAngularBlocks:s,tokenizeAngularLetDeclaration:a}}var Zt$1=new Map([["*",new Set(["accesskey","autocapitalize","autocorrect","autofocus","class","contenteditable","dir","draggable","enterkeyhint","exportparts","hidden","id","inert","inputmode","is","itemid","itemprop","itemref","itemscope","itemtype","lang","nonce","part","popover","slot","spellcheck","style","tabindex","title","translate","writingsuggestions"])],["a",new Set(["charset","coords","download","href","hreflang","name","ping","referrerpolicy","rel","rev","shape","target","type"])],["applet",new Set(["align","alt","archive","code","codebase","height","hspace","name","object","vspace","width"])],["area",new Set(["alt","coords","download","href","hreflang","nohref","ping","referrerpolicy","rel","shape","target","type"])],["audio",new Set(["autoplay","controls","crossorigin","loop","muted","preload","src"])],["base",new Set(["href","target"])],["basefont",new Set(["color","face","size"])],["blockquote",new Set(["cite"])],["body",new Set(["alink","background","bgcolor","link","text","vlink"])],["br",new Set(["clear"])],["button",new Set(["command","commandfor","disabled","form","formaction","formenctype","formmethod","formnovalidate","formtarget","name","popovertarget","popovertargetaction","type","value"])],["canvas",new Set(["height","width"])],["caption",new Set(["align"])],["col",new Set(["align","char","charoff","span","valign","width"])],["colgroup",new Set(["align","char","charoff","span","valign","width"])],["data",new Set(["value"])],["del",new Set(["cite","datetime"])],["details",new Set(["name","open"])],["dialog",new Set(["closedby","open"])],["dir",new Set(["compact"])],["div",new Set(["align"])],["dl",new Set(["compact"])],["embed",new Set(["height","src","type","width"])],["fieldset",new Set(["disabled","form","name"])],["font",new Set(["color","face","size"])],["form",new Set(["accept","accept-charset","action","autocomplete","enctype","method","name","novalidate","target"])],["frame",new Set(["frameborder","longdesc","marginheight","marginwidth","name","noresize","scrolling","src"])],["frameset",new Set(["cols","rows"])],["h1",new Set(["align"])],["h2",new Set(["align"])],["h3",new Set(["align"])],["h4",new Set(["align"])],["h5",new Set(["align"])],["h6",new Set(["align"])],["head",new Set(["profile"])],["hr",new Set(["align","noshade","size","width"])],["html",new Set(["manifest","version"])],["iframe",new Set(["align","allow","allowfullscreen","allowpaymentrequest","allowusermedia","frameborder","height","loading","longdesc","marginheight","marginwidth","name","referrerpolicy","sandbox","scrolling","src","srcdoc","width"])],["img",new Set(["align","alt","border","crossorigin","decoding","fetchpriority","height","hspace","ismap","loading","longdesc","name","referrerpolicy","sizes","src","srcset","usemap","vspace","width"])],["input",new Set(["accept","align","alpha","alt","autocomplete","checked","colorspace","dirname","disabled","form","formaction","formenctype","formmethod","formnovalidate","formtarget","height","ismap","list","max","maxlength","min","minlength","multiple","name","pattern","placeholder","popovertarget","popovertargetaction","readonly","required","size","src","step","type","usemap","value","width"])],["ins",new Set(["cite","datetime"])],["isindex",new Set(["prompt"])],["label",new Set(["for","form"])],["legend",new Set(["align"])],["li",new Set(["type","value"])],["link",new Set(["as","blocking","charset","color","crossorigin","disabled","fetchpriority","href","hreflang","imagesizes","imagesrcset","integrity","media","referrerpolicy","rel","rev","sizes","target","type"])],["map",new Set(["name"])],["menu",new Set(["compact"])],["meta",new Set(["charset","content","http-equiv","media","name","scheme"])],["meter",new Set(["high","low","max","min","optimum","value"])],["object",new Set(["align","archive","border","classid","codebase","codetype","data","declare","form","height","hspace","name","standby","type","typemustmatch","usemap","vspace","width"])],["ol",new Set(["compact","reversed","start","type"])],["optgroup",new Set(["disabled","label"])],["option",new Set(["disabled","label","selected","value"])],["output",new Set(["for","form","name"])],["p",new Set(["align"])],["param",new Set(["name","type","value","valuetype"])],["pre",new Set(["width"])],["progress",new Set(["max","value"])],["q",new Set(["cite"])],["script",new Set(["async","blocking","charset","crossorigin","defer","fetchpriority","integrity","language","nomodule","referrerpolicy","src","type"])],["select",new Set(["autocomplete","disabled","form","multiple","name","required","size"])],["slot",new Set(["name"])],["source",new Set(["height","media","sizes","src","srcset","type","width"])],["style",new Set(["blocking","media","type"])],["table",new Set(["align","bgcolor","border","cellpadding","cellspacing","frame","rules","summary","width"])],["tbody",new Set(["align","char","charoff","valign"])],["td",new Set(["abbr","align","axis","bgcolor","char","charoff","colspan","headers","height","nowrap","rowspan","scope","valign","width"])],["template",new Set(["shadowrootclonable","shadowrootcustomelementregistry","shadowrootdelegatesfocus","shadowrootmode","shadowrootserializable"])],["textarea",new Set(["autocomplete","cols","dirname","disabled","form","maxlength","minlength","name","placeholder","readonly","required","rows","wrap"])],["tfoot",new Set(["align","char","charoff","valign"])],["th",new Set(["abbr","align","axis","bgcolor","char","charoff","colspan","headers","height","nowrap","rowspan","scope","valign","width"])],["thead",new Set(["align","char","charoff","valign"])],["time",new Set(["datetime"])],["tr",new Set(["align","bgcolor","char","charoff","valign"])],["track",new Set(["default","kind","label","src","srclang"])],["ul",new Set(["compact","type"])],["video",new Set(["autoplay","controls","crossorigin","height","loop","muted","playsinline","poster","preload","src","width"])]]);var _s=new Set(["a","abbr","acronym","address","applet","area","article","aside","audio","b","base","basefont","bdi","bdo","bgsound","big","blink","blockquote","body","br","button","canvas","caption","center","cite","code","col","colgroup","command","content","data","datalist","dd","del","details","dfn","dialog","dir","div","dl","dt","em","embed","fencedframe","fieldset","figcaption","figure","font","footer","form","frame","frameset","h1","h2","h3","h4","h5","h6","head","header","hgroup","hr","html","i","iframe","image","img","input","ins","isindex","kbd","keygen","label","legend","li","link","listing","main","map","mark","marquee","math","menu","menuitem","meta","meter","multicol","nav","nextid","nobr","noembed","noframes","noscript","object","ol","optgroup","option","output","p","param","picture","plaintext","pre","progress","q","rb","rbc","rp","rt","rtc","ruby","s","samp","script","search","section","select","selectedcontent","shadow","slot","small","source","spacer","span","strike","strong","style","sub","summary","sup","svg","table","tbody","td","template","textarea","tfoot","th","thead","time","title","tr","track","tt","u","ul","var","video","wbr","xmp"]);var er$1={attrs:true,children:true,cases:true,expression:true},Ss=new Set(["parent"]),oe$1,$r$1,zr$1,We$1=class We{constructor(t={}){tn$1(this,oe$1);ir$1(this,"kind");ir$1(this,"parent");for(let r of new Set([...Ss,...Object.keys(t)]))this.setProperty(r,t[r]);if(ce$1(t))for(let r of Object.getOwnPropertySymbols(t))this.setProperty(r,t[r]);}setProperty(t,r){if(this[t]!==r){if(t in er$1&&(r=r.map(n=>this.createChild(n))),!Ss.has(t)){this[t]=r;return}Object.defineProperty(this,t,{value:r,enumerable:false,configurable:true});}}map(t){let r;for(let n in er$1){let i=this[n];if(i){let s=ul(i,a=>a.map(t));r!==i&&(r||(r=new We({parent:this.parent})),r.setProperty(n,s));}}if(r)for(let n in this)n in er$1||(r[n]=this[n]);return t(r||this)}walk(t){for(let r in er$1){let n=this[r];if(n)for(let i=0;i<n.length;i++)n[i].walk(t);}t(this);}createChild(t){let r=t instanceof We?t.clone():new We(t);return r.setProperty("parent",this),r}insertChildBefore(t,r){let n=this.$children;n.splice(n.indexOf(t),0,this.createChild(r));}removeChild(t){let r=this.$children;r.splice(r.indexOf(t),1);}replaceChild(t,r){let n=this.$children;n[n.indexOf(t)]=this.createChild(r);}clone(){return new We(this)}get $children(){return this[$e(this,oe$1,$r$1)]}set $children(t){this[$e(this,oe$1,$r$1)]=t;}get firstChild(){return this.$children?.[0]}get lastChild(){return F(1,this.$children,-1)}get prev(){let t=$e(this,oe$1,zr$1);return t[t.indexOf(this)-1]}get next(){let t=$e(this,oe$1,zr$1);return t[t.indexOf(this)+1]}get rawName(){return this.hasExplicitNamespace?this.fullName:this.name}get fullName(){return this.namespace?this.namespace+":"+this.name:this.name}get attrMap(){return Object.fromEntries(this.attrs.map(t=>[t.fullName,t.value]))}};oe$1=new WeakSet,$r$1=function(){return this.kind==="angularIcuCase"?"expression":this.kind==="angularIcuExpression"?"cases":"children"},zr$1=function(){return this.parent?.$children??[]};var tr$1=We$1;function ul(e,t){let r=e.map(t);return r.some((n,i)=>n!==e[i])?r:e}var pl=[{regex:/^(?<openingTagSuffix>\[if(?<condition>[^\]]*)\]>)(?<data>.*?)<!\s*\[endif\]$/su,parse:hl},{regex:/^\[if(?<condition>[^\]]*)\]><!$/u,parse:ml},{regex:/^<!\s*\[endif\]$/u,parse:fl}];function Es(e,t){if(e.value)for(let{regex:r,parse:n}of pl){let i=e.value.match(r);if(i)return n(e,i,t)}return null}function hl(e,t,r){let{openingTagSuffix:n,condition:i,data:s}=t.groups,a=4+n.length,o=e.sourceSpan.start.moveBy(a),c=o.moveBy(s.length),[u,p]=(()=>{try{return [!0,r(s,o).children]}catch{return [false,[{kind:"text",value:s,sourceSpan:new h(o,c)}]]}})();return {kind:"ieConditionalComment",complete:u,children:p,condition:w$1(0,i.trim(),/\s+/gu," "),sourceSpan:e.sourceSpan,startSourceSpan:new h(e.sourceSpan.start,o),endSourceSpan:new h(c,e.sourceSpan.end)}}function ml(e,t){let{condition:r}=t.groups;return {kind:"ieConditionalStartComment",condition:w$1(0,r.trim(),/\s+/gu," "),sourceSpan:e.sourceSpan}}function fl(e){return {kind:"ieConditionalEndComment",sourceSpan:e.sourceSpan}}var Yr$1=class Yr extends Pr$1{visitExpansionCase(t,r){r.parseOptions.name==="angular"&&this.visitChildren(r,n=>{n(t.expression);});}visit(t,{parseOptions:r}){Sl(t),El(t,r),vl(t,r),Cl(t);}};function Ts(e,t,r,n){Wt$1(new Yr$1,e.children,{parseOptions:r}),t&&e.children.unshift(t);let i=new tr$1(e);return i.walk(s=>{if(s.kind==="comment"){let a=Es(s,n);a&&s.parent.replaceChild(s,a);}dl(s),gl(s),_l(s);}),i}function dl(e){if(e.kind==="block"){if(e.name=w$1(0,e.name.toLowerCase(),/\s+/gu," ").trim(),e.kind="angularControlFlowBlock",!Ie$1(e.parameters)){delete e.parameters;return}for(let t of e.parameters)t.kind="angularControlFlowBlockParameter";e.parameters={kind:"angularControlFlowBlockParameters",children:e.parameters,sourceSpan:new h(e.parameters[0].sourceSpan.start,F(0,e.parameters,-1).sourceSpan.end)};}}function gl(e){e.kind==="letDeclaration"&&(e.kind="angularLetDeclaration",e.id=e.name,e.init={kind:"angularLetDeclarationInitializer",sourceSpan:new h(e.valueSpan.start,e.valueSpan.end),value:e.value},delete e.name,delete e.value);}function _l(e){e.kind==="expansion"&&(e.kind="angularIcuExpression"),e.kind==="expansionCase"&&(e.kind="angularIcuCase");}function Cs(e,t){let r=e.toLowerCase();return t(r)?r:e}function vs(e){let t=e.name.startsWith(":")?e.name.slice(1).split(":")[0]:null,r=e.nameSpan.toString(),n=t!==null&&r.startsWith(`${t}:`),i=n?r.slice(t.length+1):r;e.name=i,e.namespace=t,e.hasExplicitNamespace=n;}function Sl(e){switch(e.kind){case "element":vs(e);for(let t of e.attrs)vs(t),t.valueSpan?(t.value=t.valueSpan.toString(),/["']/u.test(t.value[0])&&(t.value=t.value.slice(1,-1))):t.value=null;break;case "comment":e.value=e.sourceSpan.toString().slice(4,-3);break;case "text":e.value=e.sourceSpan.toString();break}}function El(e,t){if(e.kind==="element"){let r=Be$1(t.isTagNameCaseSensitive?e.name:e.name.toLowerCase());!e.namespace||e.namespace===r.implicitNamespacePrefix||ue$1(e)?e.tagDefinition=r:e.tagDefinition=Be$1("");}}function Cl(e){e.sourceSpan&&e.endSourceSpan&&(e.sourceSpan=new h(e.sourceSpan.start,e.endSourceSpan.end));}function vl(e,t){if(e.kind==="element"&&(t.normalizeTagName&&(!e.namespace||e.namespace===e.tagDefinition.implicitNamespacePrefix||ue$1(e))&&(e.name=Cs(e.name,r=>_s.has(r))),t.normalizeAttributeName))for(let r of e.attrs)r.namespace||(r.name=Cs(r.name,n=>Zt$1.has(e.name)&&(Zt$1.get("*").has(n)||Zt$1.get(e.name).has(n))));}function Xr$1(e,t){let{rootNodes:r,errors:n}=Qt$1(e,Gr$1(t));return n.length>0&&jr$1(n[0]),{parseOptions:t,rootNodes:r}}function bs(e,t){let r=Gr$1(t),{rootNodes:n,errors:i}=Qt$1(e,r);if(n.some(u=>u.kind==="docType"&&u.value==="html"||u.kind==="element"&&u.name.toLowerCase()==="html"))return Xr$1(e,rr$1);let a,o=()=>a??(a=Qt$1(e,{...r,getTagContentType:void 0})),c=u=>{let{offset:p}=u.startSourceSpan.start;return o().rootNodes.find(d=>d.kind==="element"&&d.startSourceSpan.start.offset===p)??u};for(let[u,p]of n.entries())if(p.kind==="element"){if(p.isVoid)i=o().errors,n[u]=c(p);else if(Tl(p)){let{endSourceSpan:d,startSourceSpan:S}=p,m=o().errors.find(g=>g.span.start.offset>S.start.offset&&g.span.start.offset<d.end.offset);m&&jr$1(m),n[u]=c(p);}}return i.length>0&&jr$1(i[0]),{parseOptions:t,rootNodes:n}}function Tl(e){if(e.kind!=="element"||e.name!=="template")return  false;let t=e.attrs.find(r=>r.name==="lang")?.value;return !t||t==="html"}function jr$1(e){let{msg:t,span:{start:r,end:n}}=e;throw gs(t,{loc:{start:{line:r.line+1,column:r.col+1},end:{line:n.line+1,column:n.col+1}},cause:e})}function bl(e,t,r,n,i,s){let{offset:a}=n,o=w$1(0,t.slice(0,a),/[^\n]/gu," ")+r,c=Kr$1(o,e,{...i,shouldParseFrontMatter:false},s);c.sourceSpan=new h(n,F(0,c.children,-1).sourceSpan.end);let u=c.children[0];return u.length===a?c.children.shift():(u.sourceSpan=new h(u.sourceSpan.start.moveBy(a),u.sourceSpan.end),u.value=u.value.slice(a)),c}function Kr$1(e,t,r,n={}){let{frontMatter:i,content:s}=r.shouldParseFrontMatter?pr$1(e):{content:e},a=new mt$1(e,n.filepath),o=new qe$1(a,0,0,0),c=o.moveBy(e.length),{parseOptions:u,rootNodes:p}=t(s,r),d={kind:"root",sourceSpan:new h(o,c),children:p},S;if(i){let[g,E]=[i.start,i.end].map(P=>new qe$1(a,P.index,P.line-1,P.column));S={...i,kind:"frontMatter",sourceSpan:new h(g,E)};}return Ts(d,S,u,(g,E)=>bl(t,e,g,E,u,n))}var rr$1=Jt$1({name:"html",normalizeTagName:true,normalizeAttributeName:true,allowHtmComponentClosingTags:true});function gt$1(e){let t=Jt$1(e),r=t.name==="vue"?bs:Xr$1;return {parse:(n,i)=>Kr$1(n,r,t,i),hasPragma:vi,hasIgnorePragma:Ti,astFormat:"html",locStart:Q,locEnd:te$1}}var wl=gt$1(rr$1),kl=new Set(["mj-style","mj-raw"]),xl=gt$1({...rr$1,name:"mjml",shouldParseAsRawText:e=>kl.has(e)}),Al=gt$1({name:"angular",tokenizeAngularBlocks:true,tokenizeAngularLetDeclaration:true}),yl=gt$1({name:"vue",isTagNameCaseSensitive:true,shouldParseAsRawText(e,t,r,n){return e.toLowerCase()!=="html"&&!r&&(e!=="template"||n.some(({name:i,value:s})=>i==="lang"&&s!=="html"&&s!==""&&s!==void 0))}}),Nl=gt$1({name:"lwc",canSelfClose:false});var Ll={html:hs};

var html = /*#__PURE__*/Object.freeze({
  __proto__: null,
  default: ws,
  languages: ms,
  options: ds,
  parsers: Qr$1,
  printers: Ll
});

var Zn=Object.create;var Mt=Object.defineProperty;var eo=Object.getOwnPropertyDescriptor;var to=Object.getOwnPropertyNames;var uo=Object.getPrototypeOf,ro=Object.prototype.hasOwnProperty;var no=(e,t)=>()=>(t||e((t={exports:{}}).exports,t),t.exports),Yt=(e,t)=>{for(var u in t)Mt(e,u,{get:t[u],enumerable:true});},oo=(e,t,u,r)=>{if(t&&typeof t=="object"||typeof t=="function")for(let o of to(t))!ro.call(e,o)&&o!==u&&Mt(e,o,{get:()=>t[o],enumerable:!(r=eo(t,o))||r.enumerable});return e};var ao=(e,t,u)=>(u=e!=null?Zn(uo(e)):{},oo(Mt(u,"default",{value:e,enumerable:true}),e));var dn=no((of,ln)=>{var yt,bt,At,_t,xt,$e,bu,Ke,Bt,cn,Tt,Ve,Nt,St,wt,pe,fn,Ot,Pt;Nt=/\/(?![*\/])(?:\[(?:[^\]\\\n\r\u2028\u2029]+|\\.)*\]|[^\/\\\n\r\u2028\u2029]+|\\.)*(\/[$_\u200C\u200D\p{ID_Continue}]*|\\)?/yu;Ve=/--|\+\+|=>|\.{3}|\??\.(?!\d)|(?:&&|\|\||\?\?|[+\-%&|^]|\*{1,2}|<{1,2}|>{1,3}|!=?|={1,2}|\/(?![\/*]))=?|[?~,:;[\](){}]/y;yt=/(\x23?)(?=[$_\p{ID_Start}\\])(?:[$_\u200C\u200D\p{ID_Continue}]+|\\u[\da-fA-F]{4}|\\u\{[\da-fA-F]+\})+/yu;wt=/(['"])(?:[^'"\\\n\r]+|(?!\1)['"]|\\(?:\r\n|[^]))*(\1)?/y;Tt=/(?:0[xX][\da-fA-F](?:_?[\da-fA-F])*|0[oO][0-7](?:_?[0-7])*|0[bB][01](?:_?[01])*)n?|0n|[1-9](?:_?\d)*n|(?:(?:0(?!\d)|0\d*[89]\d*|[1-9](?:_?\d)*)(?:\.(?:\d(?:_?\d)*)?)?|\.\d(?:_?\d)*)(?:[eE][+-]?\d(?:_?\d)*)?|0[0-7]+/y;pe=/[`}](?:[^`\\$]+|\\[^]|\$(?!\{))*(`|\$\{)?/y;Pt=/[\t\v\f\ufeff\p{Zs}]+/yu;Ke=/\r?\n|[\r\u2028\u2029]/y;Bt=/\/\*(?:[^*]+|\*(?!\/))*(\*\/)?/y;St=/\/\/.*/y;At=/[<>.:={}]|\/(?![\/*])/y;bt=/[$_\p{ID_Start}][$_\u200C\u200D\p{ID_Continue}-]*/yu;_t=/(['"])(?:[^'"]+|(?!\1)['"])*(\1)?/y;xt=/[^<>{}]+/y;Ot=/^(?:[\/+-]|\.{3}|\?(?:InterpolationIn(?:JSX|Template)|NoLineTerminatorHere|NonExpressionParenEnd|UnaryIncDec))?$|[{}([,;<>=*%&|^!~?:]$/;fn=/^(?:=>|[;\]){}]|else|\?(?:NoLineTerminatorHere|NonExpressionParenEnd))?$/;$e=/^(?:await|case|default|delete|do|else|instanceof|new|return|throw|typeof|void|yield)$/;bu=/^(?:return|throw|yield)$/;cn=RegExp(Ke.source);ln.exports=function*(e,{jsx:t=false}={}){var u,r,o,n,a,s,i,D,f,l,d,c,p,F;for({length:s}=e,n=0,a="",F=[{tag:"JS"}],u=[],d=0,c=false;n<s;){switch(D=F[F.length-1],D.tag){case "JS":case "JSNonExpressionParen":case "InterpolationInTemplate":case "InterpolationInJSX":if(e[n]==="/"&&(Ot.test(a)||$e.test(a))&&(Nt.lastIndex=n,i=Nt.exec(e))){n=Nt.lastIndex,a=i[0],c=true,yield {type:"RegularExpressionLiteral",value:i[0],closed:i[1]!==void 0&&i[1]!=="\\"};continue}if(Ve.lastIndex=n,i=Ve.exec(e)){switch(p=i[0],f=Ve.lastIndex,l=p,p){case "(":a==="?NonExpressionParenKeyword"&&F.push({tag:"JSNonExpressionParen",nesting:d}),d++,c=false;break;case ")":d--,c=true,D.tag==="JSNonExpressionParen"&&d===D.nesting&&(F.pop(),l="?NonExpressionParenEnd",c=false);break;case "{":Ve.lastIndex=0,o=!fn.test(a)&&(Ot.test(a)||$e.test(a)),u.push(o),c=false;break;case "}":switch(D.tag){case "InterpolationInTemplate":if(u.length===D.nesting){pe.lastIndex=n,i=pe.exec(e),n=pe.lastIndex,a=i[0],i[1]==="${"?(a="?InterpolationInTemplate",c=false,yield {type:"TemplateMiddle",value:i[0]}):(F.pop(),c=true,yield {type:"TemplateTail",value:i[0],closed:i[1]==="`"});continue}break;case "InterpolationInJSX":if(u.length===D.nesting){F.pop(),n+=1,a="}",yield {type:"JSXPunctuator",value:"}"};continue}}c=u.pop(),l=c?"?ExpressionBraceEnd":"}";break;case "]":c=true;break;case "++":case "--":l=c?"?PostfixIncDec":"?UnaryIncDec";break;case "<":if(t&&(Ot.test(a)||$e.test(a))){F.push({tag:"JSXTag"}),n+=1,a="<",yield {type:"JSXPunctuator",value:p};continue}c=false;break;default:c=false;}n=f,a=l,yield {type:"Punctuator",value:p};continue}if(yt.lastIndex=n,i=yt.exec(e)){switch(n=yt.lastIndex,l=i[0],i[0]){case "for":case "if":case "while":case "with":a!=="."&&a!=="?."&&(l="?NonExpressionParenKeyword");}a=l,c=!$e.test(i[0]),yield {type:i[1]==="#"?"PrivateIdentifier":"IdentifierName",value:i[0]};continue}if(wt.lastIndex=n,i=wt.exec(e)){n=wt.lastIndex,a=i[0],c=true,yield {type:"StringLiteral",value:i[0],closed:i[2]!==void 0};continue}if(Tt.lastIndex=n,i=Tt.exec(e)){n=Tt.lastIndex,a=i[0],c=true,yield {type:"NumericLiteral",value:i[0]};continue}if(pe.lastIndex=n,i=pe.exec(e)){n=pe.lastIndex,a=i[0],i[1]==="${"?(a="?InterpolationInTemplate",F.push({tag:"InterpolationInTemplate",nesting:u.length}),c=false,yield {type:"TemplateHead",value:i[0]}):(c=true,yield {type:"NoSubstitutionTemplate",value:i[0],closed:i[1]==="`"});continue}break;case "JSXTag":case "JSXTagEnd":if(At.lastIndex=n,i=At.exec(e)){switch(n=At.lastIndex,l=i[0],i[0]){case "<":F.push({tag:"JSXTag"});break;case ">":F.pop(),a==="/"||D.tag==="JSXTagEnd"?(l="?JSX",c=true):F.push({tag:"JSXChildren"});break;case "{":F.push({tag:"InterpolationInJSX",nesting:u.length}),l="?InterpolationInJSX",c=false;break;case "/":a==="<"&&(F.pop(),F[F.length-1].tag==="JSXChildren"&&F.pop(),F.push({tag:"JSXTagEnd"}));}a=l,yield {type:"JSXPunctuator",value:i[0]};continue}if(bt.lastIndex=n,i=bt.exec(e)){n=bt.lastIndex,a=i[0],yield {type:"JSXIdentifier",value:i[0]};continue}if(_t.lastIndex=n,i=_t.exec(e)){n=_t.lastIndex,a=i[0],yield {type:"JSXString",value:i[0],closed:i[2]!==void 0};continue}break;case "JSXChildren":if(xt.lastIndex=n,i=xt.exec(e)){n=xt.lastIndex,a=i[0],yield {type:"JSXText",value:i[0]};continue}switch(e[n]){case "<":F.push({tag:"JSXTag"}),n++,a="<",yield {type:"JSXPunctuator",value:"<"};continue;case "{":F.push({tag:"InterpolationInJSX",nesting:u.length}),n++,a="?InterpolationInJSX",c=false,yield {type:"JSXPunctuator",value:"{"};continue}}if(Pt.lastIndex=n,i=Pt.exec(e)){n=Pt.lastIndex,yield {type:"WhiteSpace",value:i[0]};continue}if(Ke.lastIndex=n,i=Ke.exec(e)){n=Ke.lastIndex,c=false,bu.test(a)&&(a="?NoLineTerminatorHere"),yield {type:"LineTerminatorSequence",value:i[0]};continue}if(Bt.lastIndex=n,i=Bt.exec(e)){n=Bt.lastIndex,cn.test(i[0])&&(c=false,bu.test(a)&&(a="?NoLineTerminatorHere")),yield {type:"MultiLineComment",value:i[0],closed:i[1]!==void 0};continue}if(St.lastIndex=n,i=St.exec(e)){n=St.lastIndex,c=false,yield {type:"SingleLineComment",value:i[0]};continue}r=String.fromCodePoint(e.codePointAt(n)),n+=r.length,a=r,c=false,yield {type:D.tag.startsWith("JSX")?"JSXInvalid":"Invalid",value:r};}};});var Hn={};Yt(Hn,{__debug:()=>li,check:()=>ci,doc:()=>wu,format:()=>Jn,formatWithCursor:()=>zn,getSupportInfo:()=>fi,util:()=>Pu,version:()=>Mn});var X=(e,t)=>(u,r,...o)=>u|1&&r==null?void 0:(t.call(r)??r[e]).apply(r,o);var io=String.prototype.replaceAll??function(e,t){return e.global?this.replace(e,t):this.split(e).join(t)},so=X("replaceAll",function(){if(typeof this=="string")return io}),oe=so;var Ne=class{diff(t,u,r={}){let o;typeof r=="function"?(o=r,r={}):"callback"in r&&(o=r.callback);let n=this.castInput(t,r),a=this.castInput(u,r),s=this.removeEmpty(this.tokenize(n,r)),i=this.removeEmpty(this.tokenize(a,r));return this.diffWithOptionsObj(s,i,r,o)}diffWithOptionsObj(t,u,r,o){var n;let a=m=>{if(m=this.postProcess(m,r),o){setTimeout(function(){o(m);},0);return}else return m},s=u.length,i=t.length,D=1,f=s+i;r.maxEditLength!=null&&(f=Math.min(f,r.maxEditLength));let l=(n=r.timeout)!==null&&n!==void 0?n:1/0,d=Date.now()+l,c=[{oldPos:-1,lastComponent:void 0}],p=this.extractCommon(c[0],u,t,0,r);if(c[0].oldPos+1>=i&&p+1>=s)return a(this.buildValues(c[0].lastComponent,u,t));let F=-1/0,C=1/0,y=()=>{for(let m=Math.max(F,-D);m<=Math.min(C,D);m+=2){let h,E=c[m-1],g=c[m+1];E&&(c[m-1]=void 0);let A=false;if(g){let Q=g.oldPos-m;A=g&&0<=Q&&Q<s;}let J=E&&E.oldPos+1<i;if(!A&&!J){c[m]=void 0;continue}if(!J||A&&E.oldPos<g.oldPos?h=this.addToPath(g,true,false,0,r):h=this.addToPath(E,false,true,1,r),p=this.extractCommon(h,u,t,m,r),h.oldPos+1>=i&&p+1>=s)return a(this.buildValues(h.lastComponent,u,t))||true;c[m]=h,h.oldPos+1>=i&&(C=Math.min(C,m-1)),p+1>=s&&(F=Math.max(F,m+1));}D++;};if(o)(function m(){setTimeout(function(){if(D>f||Date.now()>d)return o(void 0);y()||m();},0);})();else for(;D<=f&&Date.now()<=d;){let m=y();if(m)return m}}addToPath(t,u,r,o,n){let a=t.lastComponent;return a&&!n.oneChangePerToken&&a.added===u&&a.removed===r?{oldPos:t.oldPos+o,lastComponent:{count:a.count+1,added:u,removed:r,previousComponent:a.previousComponent}}:{oldPos:t.oldPos+o,lastComponent:{count:1,added:u,removed:r,previousComponent:a}}}extractCommon(t,u,r,o,n){let a=u.length,s=r.length,i=t.oldPos,D=i-o,f=0;for(;D+1<a&&i+1<s&&this.equals(r[i+1],u[D+1],n);)D++,i++,f++,n.oneChangePerToken&&(t.lastComponent={count:1,previousComponent:t.lastComponent,added:false,removed:false});return f&&!n.oneChangePerToken&&(t.lastComponent={count:f,previousComponent:t.lastComponent,added:false,removed:false}),t.oldPos=i,D}equals(t,u,r){return r.comparator?r.comparator(t,u):t===u||!!r.ignoreCase&&t.toLowerCase()===u.toLowerCase()}removeEmpty(t){let u=[];for(let r=0;r<t.length;r++)t[r]&&u.push(t[r]);return u}castInput(t,u){return t}tokenize(t,u){return Array.from(t)}join(t){return t.join("")}postProcess(t,u){return t}get useLongestToken(){return  false}buildValues(t,u,r){let o=[],n;for(;t;)o.push(t),n=t.previousComponent,delete t.previousComponent,t=n;o.reverse();let a=o.length,s=0,i=0,D=0;for(;s<a;s++){let f=o[s];if(f.removed)f.value=this.join(r.slice(D,D+f.count)),D+=f.count;else {if(!f.added&&this.useLongestToken){let l=u.slice(i,i+f.count);l=l.map(function(d,c){let p=r[D+c];return p.length>d.length?p:d}),f.value=this.join(l);}else f.value=this.join(u.slice(i,i+f.count));i+=f.count,f.added||(D+=f.count);}}return o}};var jt=class extends Ne{tokenize(t){return t.slice()}join(t){return t}removeEmpty(t){return t}},ku=new jt;function Ut(e,t,u){return ku.diff(e,t,u)}var Do=()=>{},P=Do;var Ru="cr",Lu="crlf",co="lf",fo=co,Wt="\r",Mu=`\r
`,Je=`
`,lo=Je;function Yu(e){let t=e.indexOf(Wt);return t!==-1?e.charAt(t+1)===Je?Lu:Ru:fo}function Se(e){return e===Ru?Wt:e===Lu?Mu:lo}var po=new Map([[Je,/\n/gu],[Wt,/\r/gu],[Mu,/\r\n/gu]]);function $t(e,t){let u=po.get(t);return e.match(u)?.length??0}var Fo=/\r\n?/gu;function ju(e){return oe(0,e,Fo,Je)}function mo(e){return this[e<0?this.length+e:e]}var Eo=X("at",function(){if(Array.isArray(this)||typeof this=="string")return mo}),b=Eo;var G="string",j="array",U="cursor",I="indent",k="align",v="trim",x="group",w="fill",B="if-break",R="indent-if-break",L="line-suffix",M="line-suffix-boundary",_="line",O="label",T="break-parent",He=new Set([U,I,k,v,x,w,B,R,L,M,_,O,T]);function Uu(e){let t=e.length;for(;t>0&&(e[t-1]==="\r"||e[t-1]===`
`);)t--;return t<e.length?e.slice(0,t):e}function Co(e){if(typeof e=="string")return G;if(Array.isArray(e))return j;if(!e)return;let{type:t}=e;if(He.has(t))return t}var H=Co;var ho=e=>new Intl.ListFormat("en-US",{type:"disjunction"}).format(e);function go(e){let t=e===null?"null":typeof e;if(t!=="string"&&t!=="object")return `Unexpected doc '${t}', 
Expected it to be 'string' or 'object'.`;if(H(e))throw new Error("doc is valid.");let u=Object.prototype.toString.call(e);if(u!=="[object Object]")return `Unexpected doc '${u}'.`;let r=ho([...He].map(o=>`'${o}'`));return `Unexpected doc.type '${e.type}'.
Expected it to be ${r}.`}var Vt=class extends Error{name="InvalidDocError";constructor(t){super(go(t)),this.doc=t;}},Z=Vt;var Wu={};function yo(e,t,u,r){let o=[e];for(;o.length>0;){let n=o.pop();if(n===Wu){u(o.pop());continue}u&&o.push(n,Wu);let a=H(n);if(!a)throw new Z(n);if(t?.(n)!==false)switch(a){case j:case w:{let s=a===j?n:n.parts;for(let i=s.length,D=i-1;D>=0;--D)o.push(s[D]);break}case B:o.push(n.flatContents,n.breakContents);break;case x:if(r&&n.expandedStates)for(let s=n.expandedStates.length,i=s-1;i>=0;--i)o.push(n.expandedStates[i]);else o.push(n.contents);break;case k:case I:case R:case O:case L:o.push(n.contents);break;case G:case U:case v:case M:case _:case T:break;default:throw new Z(n)}}}var we=yo;function Pe(e,t){if(typeof e=="string")return t(e);let u=new Map;return r(e);function r(n){if(u.has(n))return u.get(n);let a=o(n);return u.set(n,a),a}function o(n){switch(H(n)){case j:return t(n.map(r));case w:return t({...n,parts:n.parts.map(r)});case B:return t({...n,breakContents:r(n.breakContents),flatContents:r(n.flatContents)});case x:{let{expandedStates:a,contents:s}=n;return a?(a=a.map(r),s=a[0]):s=r(s),t({...n,contents:s,expandedStates:a})}case k:case I:case R:case O:case L:return t({...n,contents:r(n.contents)});case G:case U:case v:case M:case _:case T:return t(n);default:throw new Z(n)}}}function Xe(e,t,u){let r=u,o=false;function n(a){if(o)return  false;let s=t(a);s!==void 0&&(o=true,r=s);}return we(e,n),r}function bo(e){if(e.type===x&&e.break||e.type===_&&e.hard||e.type===T)return  true}function Ku(e){return Xe(e,bo,false)}function $u(e){if(e.length>0){let t=b(0,e,-1);!t.expandedStates&&!t.break&&(t.break="propagated");}return null}function Gu(e){let t=new Set,u=[];function r(n){if(n.type===T&&$u(u),n.type===x){if(u.push(n),t.has(n))return  false;t.add(n);}}function o(n){n.type===x&&u.pop().break&&$u(u);}we(e,r,o,true);}function Ao(e){return e.type===_&&!e.hard?e.soft?"":" ":e.type===B?e.flatContents:e}function zu(e){return Pe(e,Ao)}function Vu(e){for(e=[...e];e.length>=2&&b(0,e,-2).type===_&&b(0,e,-1).type===T;)e.length-=2;if(e.length>0){let t=Oe(b(0,e,-1));e[e.length-1]=t;}return e}function Oe(e){switch(H(e)){case I:case R:case x:case L:case O:{let t=Oe(e.contents);return {...e,contents:t}}case B:return {...e,breakContents:Oe(e.breakContents),flatContents:Oe(e.flatContents)};case w:return {...e,parts:Vu(e.parts)};case j:return Vu(e);case G:return Uu(e);case k:case U:case v:case M:case _:case T:break;default:throw new Z(e)}return e}function qe(e){return Oe(xo(e))}function _o(e){switch(H(e)){case w:if(e.parts.every(t=>t===""))return "";break;case x:if(!e.contents&&!e.id&&!e.break&&!e.expandedStates)return "";if(e.contents.type===x&&e.contents.id===e.id&&e.contents.break===e.break&&e.contents.expandedStates===e.expandedStates)return e.contents;break;case k:case I:case R:case L:if(!e.contents)return "";break;case B:if(!e.flatContents&&!e.breakContents)return "";break;case j:{let t=[];for(let u of e){if(!u)continue;let[r,...o]=Array.isArray(u)?u:[u];typeof r=="string"&&typeof b(0,t,-1)=="string"?t[t.length-1]+=r:t.push(r),t.push(...o);}return t.length===0?"":t.length===1?t[0]:t}case G:case U:case v:case M:case _:case O:case T:break;default:throw new Z(e)}return e}function xo(e){return Pe(e,t=>_o(t))}function Ju(e,t=Qe){return Pe(e,u=>typeof u=="string"?Ie(t,u.split(`
`)):u)}function Bo(e){if(e.type===_)return  true}function Hu(e){return Xe(e,Bo,false)}function Ee(e,t){return e.type===O?{...e,contents:t(e.contents)}:t(e)}var Ze=P;function ae(e){return {type:I,contents:e}}function De(e,t){return {type:k,contents:t,n:e}}function Qu(e){return De(Number.NEGATIVE_INFINITY,e)}function et(e){return De({type:"root"},e)}function Zu(e){return De(-1,e)}function tt(e,t,u){let r=e;if(t>0){for(let o=0;o<Math.floor(t/u);++o)r=ae(r);r=De(t%u,r),r=De(Number.NEGATIVE_INFINITY,r);}return r}var ce={type:T};var ee={type:U};function er(e){return {type:w,parts:e}}function Kt(e,t={}){return Ze(t.expandedStates),{type:x,id:t.id,contents:e,break:!!t.shouldBreak,expandedStates:t.expandedStates}}function tr(e,t){return Kt(e[0],{...t,expandedStates:e})}function ur(e,t="",u={}){return {type:B,breakContents:e,flatContents:t,groupId:u.groupId}}function rr(e,t){return {type:R,contents:e,groupId:t.groupId,negate:t.negate}}function Ie(e,t){let u=[];for(let r=0;r<t.length;r++)r!==0&&u.push(e),u.push(t[r]);return u}function nr(e,t){return e?{type:O,label:e,contents:t}:t}var ut={type:_},or={type:_,soft:true},ke={type:_,hard:true},V=[ke,ce],Gt={type:_,hard:true,literal:true},Qe=[Gt,ce];function ve(e){return {type:L,contents:e}}var ar={type:M};var ir={type:v};function te(e){if(!e)return "";if(Array.isArray(e)){let t=[];for(let u of e)if(Array.isArray(u))t.push(...te(u));else {let r=te(u);r!==""&&t.push(r);}return t}return e.type===B?{...e,breakContents:te(e.breakContents),flatContents:te(e.flatContents)}:e.type===x?{...e,contents:te(e.contents),expandedStates:e.expandedStates?.map(te)}:e.type===w?{type:"fill",parts:e.parts.map(te)}:e.contents?{...e,contents:te(e.contents)}:e}function sr(e){let t=Object.create(null),u=new Set;return r(te(e));function r(n,a,s){if(typeof n=="string")return JSON.stringify(n);if(Array.isArray(n)){let i=n.map(r).filter(Boolean);return i.length===1?i[0]:`[${i.join(", ")}]`}if(n.type===_){let i=s?.[a+1]?.type===T;return n.literal?i?"literalline":"literallineWithoutBreakParent":n.hard?i?"hardline":"hardlineWithoutBreakParent":n.soft?"softline":"line"}if(n.type===T)return s?.[a-1]?.type===_&&s[a-1].hard?void 0:"breakParent";if(n.type===v)return "trim";if(n.type===I)return "indent("+r(n.contents)+")";if(n.type===k)return n.n===Number.NEGATIVE_INFINITY?"dedentToRoot("+r(n.contents)+")":n.n<0?"dedent("+r(n.contents)+")":n.n.type==="root"?"markAsRoot("+r(n.contents)+")":"align("+JSON.stringify(n.n)+", "+r(n.contents)+")";if(n.type===B)return "ifBreak("+r(n.breakContents)+(n.flatContents?", "+r(n.flatContents):"")+(n.groupId?(n.flatContents?"":', ""')+`, { groupId: ${o(n.groupId)} }`:"")+")";if(n.type===R){let i=[];n.negate&&i.push("negate: true"),n.groupId&&i.push(`groupId: ${o(n.groupId)}`);let D=i.length>0?`, { ${i.join(", ")} }`:"";return `indentIfBreak(${r(n.contents)}${D})`}if(n.type===x){let i=[];n.break&&n.break!=="propagated"&&i.push("shouldBreak: true"),n.id&&i.push(`id: ${o(n.id)}`);let D=i.length>0?`, { ${i.join(", ")} }`:"";return n.expandedStates?`conditionalGroup([${n.expandedStates.map(f=>r(f)).join(",")}]${D})`:`group(${r(n.contents)}${D})`}if(n.type===w)return `fill([${n.parts.map(i=>r(i)).join(", ")}])`;if(n.type===L)return "lineSuffix("+r(n.contents)+")";if(n.type===M)return "lineSuffixBoundary";if(n.type===O)return `label(${JSON.stringify(n.label)}, ${r(n.contents)})`;if(n.type===U)return "cursor";throw new Error("Unknown doc type "+n.type)}function o(n){if(typeof n!="symbol")return JSON.stringify(String(n));if(n in t)return t[n];let a=n.description||"symbol";for(let s=0;;s++){let i=a+(s>0?` #${s}`:"");if(!u.has(i))return u.add(i),t[n]=`Symbol.for(${JSON.stringify(i)})`}}}var Dr=()=>/[#*0-9]\uFE0F?\u20E3|[\xA9\xAE\u203C\u2049\u2122\u2139\u2194-\u2199\u21A9\u21AA\u231A\u231B\u2328\u23CF\u23ED-\u23EF\u23F1\u23F2\u23F8-\u23FA\u24C2\u25AA\u25AB\u25B6\u25C0\u25FB\u25FC\u25FE\u2600-\u2604\u260E\u2611\u2614\u2615\u2618\u2620\u2622\u2623\u2626\u262A\u262E\u262F\u2638-\u263A\u2640\u2642\u2648-\u2653\u265F\u2660\u2663\u2665\u2666\u2668\u267B\u267E\u267F\u2692\u2694-\u2697\u2699\u269B\u269C\u26A0\u26A7\u26AA\u26B0\u26B1\u26BD\u26BE\u26C4\u26C8\u26CF\u26D1\u26E9\u26F0-\u26F5\u26F7\u26F8\u26FA\u2702\u2708\u2709\u270F\u2712\u2714\u2716\u271D\u2721\u2733\u2734\u2744\u2747\u2757\u2763\u27A1\u2934\u2935\u2B05-\u2B07\u2B1B\u2B1C\u2B55\u3030\u303D\u3297\u3299]\uFE0F?|[\u261D\u270C\u270D](?:\uD83C[\uDFFB-\uDFFF]|\uFE0F)?|[\u270A\u270B](?:\uD83C[\uDFFB-\uDFFF])?|[\u23E9-\u23EC\u23F0\u23F3\u25FD\u2693\u26A1\u26AB\u26C5\u26CE\u26D4\u26EA\u26FD\u2705\u2728\u274C\u274E\u2753-\u2755\u2795-\u2797\u27B0\u27BF\u2B50]|\u26D3\uFE0F?(?:\u200D\uD83D\uDCA5)?|\u26F9(?:\uD83C[\uDFFB-\uDFFF]|\uFE0F)?(?:\u200D[\u2640\u2642]\uFE0F?)?|\u2764\uFE0F?(?:\u200D(?:\uD83D\uDD25|\uD83E\uDE79))?|\uD83C(?:[\uDC04\uDD70\uDD71\uDD7E\uDD7F\uDE02\uDE37\uDF21\uDF24-\uDF2C\uDF36\uDF7D\uDF96\uDF97\uDF99-\uDF9B\uDF9E\uDF9F\uDFCD\uDFCE\uDFD4-\uDFDF\uDFF5\uDFF7]\uFE0F?|[\uDF85\uDFC2\uDFC7](?:\uD83C[\uDFFB-\uDFFF])?|[\uDFC4\uDFCA](?:\uD83C[\uDFFB-\uDFFF])?(?:\u200D[\u2640\u2642]\uFE0F?)?|[\uDFCB\uDFCC](?:\uD83C[\uDFFB-\uDFFF]|\uFE0F)?(?:\u200D[\u2640\u2642]\uFE0F?)?|[\uDCCF\uDD8E\uDD91-\uDD9A\uDE01\uDE1A\uDE2F\uDE32-\uDE36\uDE38-\uDE3A\uDE50\uDE51\uDF00-\uDF20\uDF2D-\uDF35\uDF37-\uDF43\uDF45-\uDF4A\uDF4C-\uDF7C\uDF7E-\uDF84\uDF86-\uDF93\uDFA0-\uDFC1\uDFC5\uDFC6\uDFC8\uDFC9\uDFCF-\uDFD3\uDFE0-\uDFF0\uDFF8-\uDFFF]|\uDDE6\uD83C[\uDDE8-\uDDEC\uDDEE\uDDF1\uDDF2\uDDF4\uDDF6-\uDDFA\uDDFC\uDDFD\uDDFF]|\uDDE7\uD83C[\uDDE6\uDDE7\uDDE9-\uDDEF\uDDF1-\uDDF4\uDDF6-\uDDF9\uDDFB\uDDFC\uDDFE\uDDFF]|\uDDE8\uD83C[\uDDE6\uDDE8\uDDE9\uDDEB-\uDDEE\uDDF0-\uDDF7\uDDFA-\uDDFF]|\uDDE9\uD83C[\uDDEA\uDDEC\uDDEF\uDDF0\uDDF2\uDDF4\uDDFF]|\uDDEA\uD83C[\uDDE6\uDDE8\uDDEA\uDDEC\uDDED\uDDF7-\uDDFA]|\uDDEB\uD83C[\uDDEE-\uDDF0\uDDF2\uDDF4\uDDF7]|\uDDEC\uD83C[\uDDE6\uDDE7\uDDE9-\uDDEE\uDDF1-\uDDF3\uDDF5-\uDDFA\uDDFC\uDDFE]|\uDDED\uD83C[\uDDF0\uDDF2\uDDF3\uDDF7\uDDF9\uDDFA]|\uDDEE\uD83C[\uDDE8-\uDDEA\uDDF1-\uDDF4\uDDF6-\uDDF9]|\uDDEF\uD83C[\uDDEA\uDDF2\uDDF4\uDDF5]|\uDDF0\uD83C[\uDDEA\uDDEC-\uDDEE\uDDF2\uDDF3\uDDF5\uDDF7\uDDFC\uDDFE\uDDFF]|\uDDF1\uD83C[\uDDE6-\uDDE8\uDDEE\uDDF0\uDDF7-\uDDFB\uDDFE]|\uDDF2\uD83C[\uDDE6\uDDE8-\uDDED\uDDF0-\uDDFF]|\uDDF3\uD83C[\uDDE6\uDDE8\uDDEA-\uDDEC\uDDEE\uDDF1\uDDF4\uDDF5\uDDF7\uDDFA\uDDFF]|\uDDF4\uD83C\uDDF2|\uDDF5\uD83C[\uDDE6\uDDEA-\uDDED\uDDF0-\uDDF3\uDDF7-\uDDF9\uDDFC\uDDFE]|\uDDF6\uD83C\uDDE6|\uDDF7\uD83C[\uDDEA\uDDF4\uDDF8\uDDFA\uDDFC]|\uDDF8\uD83C[\uDDE6-\uDDEA\uDDEC-\uDDF4\uDDF7-\uDDF9\uDDFB\uDDFD-\uDDFF]|\uDDF9\uD83C[\uDDE6\uDDE8\uDDE9\uDDEB-\uDDED\uDDEF-\uDDF4\uDDF7\uDDF9\uDDFB\uDDFC\uDDFF]|\uDDFA\uD83C[\uDDE6\uDDEC\uDDF2\uDDF3\uDDF8\uDDFE\uDDFF]|\uDDFB\uD83C[\uDDE6\uDDE8\uDDEA\uDDEC\uDDEE\uDDF3\uDDFA]|\uDDFC\uD83C[\uDDEB\uDDF8]|\uDDFD\uD83C\uDDF0|\uDDFE\uD83C[\uDDEA\uDDF9]|\uDDFF\uD83C[\uDDE6\uDDF2\uDDFC]|\uDF44(?:\u200D\uD83D\uDFEB)?|\uDF4B(?:\u200D\uD83D\uDFE9)?|\uDFC3(?:\uD83C[\uDFFB-\uDFFF])?(?:\u200D(?:[\u2640\u2642]\uFE0F?(?:\u200D\u27A1\uFE0F?)?|\u27A1\uFE0F?))?|\uDFF3\uFE0F?(?:\u200D(?:\u26A7\uFE0F?|\uD83C\uDF08))?|\uDFF4(?:\u200D\u2620\uFE0F?|\uDB40\uDC67\uDB40\uDC62\uDB40(?:\uDC65\uDB40\uDC6E\uDB40\uDC67|\uDC73\uDB40\uDC63\uDB40\uDC74|\uDC77\uDB40\uDC6C\uDB40\uDC73)\uDB40\uDC7F)?)|\uD83D(?:[\uDC3F\uDCFD\uDD49\uDD4A\uDD6F\uDD70\uDD73\uDD76-\uDD79\uDD87\uDD8A-\uDD8D\uDDA5\uDDA8\uDDB1\uDDB2\uDDBC\uDDC2-\uDDC4\uDDD1-\uDDD3\uDDDC-\uDDDE\uDDE1\uDDE3\uDDE8\uDDEF\uDDF3\uDDFA\uDECB\uDECD-\uDECF\uDEE0-\uDEE5\uDEE9\uDEF0\uDEF3]\uFE0F?|[\uDC42\uDC43\uDC46-\uDC50\uDC66\uDC67\uDC6B-\uDC6D\uDC72\uDC74-\uDC76\uDC78\uDC7C\uDC83\uDC85\uDC8F\uDC91\uDCAA\uDD7A\uDD95\uDD96\uDE4C\uDE4F\uDEC0\uDECC](?:\uD83C[\uDFFB-\uDFFF])?|[\uDC6E-\uDC71\uDC73\uDC77\uDC81\uDC82\uDC86\uDC87\uDE45-\uDE47\uDE4B\uDE4D\uDE4E\uDEA3\uDEB4\uDEB5](?:\uD83C[\uDFFB-\uDFFF])?(?:\u200D[\u2640\u2642]\uFE0F?)?|[\uDD74\uDD90](?:\uD83C[\uDFFB-\uDFFF]|\uFE0F)?|[\uDC00-\uDC07\uDC09-\uDC14\uDC16-\uDC25\uDC27-\uDC3A\uDC3C-\uDC3E\uDC40\uDC44\uDC45\uDC51-\uDC65\uDC6A\uDC79-\uDC7B\uDC7D-\uDC80\uDC84\uDC88-\uDC8E\uDC90\uDC92-\uDCA9\uDCAB-\uDCFC\uDCFF-\uDD3D\uDD4B-\uDD4E\uDD50-\uDD67\uDDA4\uDDFB-\uDE2D\uDE2F-\uDE34\uDE37-\uDE41\uDE43\uDE44\uDE48-\uDE4A\uDE80-\uDEA2\uDEA4-\uDEB3\uDEB7-\uDEBF\uDEC1-\uDEC5\uDED0-\uDED2\uDED5-\uDED8\uDEDC-\uDEDF\uDEEB\uDEEC\uDEF4-\uDEFC\uDFE0-\uDFEB\uDFF0]|\uDC08(?:\u200D\u2B1B)?|\uDC15(?:\u200D\uD83E\uDDBA)?|\uDC26(?:\u200D(?:\u2B1B|\uD83D\uDD25))?|\uDC3B(?:\u200D\u2744\uFE0F?)?|\uDC41\uFE0F?(?:\u200D\uD83D\uDDE8\uFE0F?)?|\uDC68(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:\uDC8B\u200D\uD83D)?\uDC68|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDC68\uDC69]\u200D\uD83D(?:\uDC66(?:\u200D\uD83D\uDC66)?|\uDC67(?:\u200D\uD83D[\uDC66\uDC67])?)|[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC66(?:\u200D\uD83D\uDC66)?|\uDC67(?:\u200D\uD83D[\uDC66\uDC67])?)|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]))|\uD83C(?:\uDFFB(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:\uDC8B\u200D\uD83D)?\uDC68\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83D\uDC68\uD83C[\uDFFC-\uDFFF])|\uD83E(?:[\uDD1D\uDEEF]\u200D\uD83D\uDC68\uD83C[\uDFFC-\uDFFF]|[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3])))?|\uDFFC(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:\uDC8B\u200D\uD83D)?\uDC68\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83D\uDC68\uD83C[\uDFFB\uDFFD-\uDFFF])|\uD83E(?:[\uDD1D\uDEEF]\u200D\uD83D\uDC68\uD83C[\uDFFB\uDFFD-\uDFFF]|[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3])))?|\uDFFD(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:\uDC8B\u200D\uD83D)?\uDC68\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83D\uDC68\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF])|\uD83E(?:[\uDD1D\uDEEF]\u200D\uD83D\uDC68\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF]|[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3])))?|\uDFFE(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:\uDC8B\u200D\uD83D)?\uDC68\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83D\uDC68\uD83C[\uDFFB-\uDFFD\uDFFF])|\uD83E(?:[\uDD1D\uDEEF]\u200D\uD83D\uDC68\uD83C[\uDFFB-\uDFFD\uDFFF]|[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3])))?|\uDFFF(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:\uDC8B\u200D\uD83D)?\uDC68\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83D\uDC68\uD83C[\uDFFB-\uDFFE])|\uD83E(?:[\uDD1D\uDEEF]\u200D\uD83D\uDC68\uD83C[\uDFFB-\uDFFE]|[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3])))?))?|\uDC69(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:\uDC8B\u200D\uD83D)?[\uDC68\uDC69]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC66(?:\u200D\uD83D\uDC66)?|\uDC67(?:\u200D\uD83D[\uDC66\uDC67])?|\uDC69\u200D\uD83D(?:\uDC66(?:\u200D\uD83D\uDC66)?|\uDC67(?:\u200D\uD83D[\uDC66\uDC67])?))|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]))|\uD83C(?:\uDFFB(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:[\uDC68\uDC69]|\uDC8B\u200D\uD83D[\uDC68\uDC69])\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83D\uDC69\uD83C[\uDFFC-\uDFFF])|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83D[\uDC68\uDC69]\uD83C[\uDFFC-\uDFFF]|\uDEEF\u200D\uD83D\uDC69\uD83C[\uDFFC-\uDFFF])))?|\uDFFC(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:[\uDC68\uDC69]|\uDC8B\u200D\uD83D[\uDC68\uDC69])\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83D\uDC69\uD83C[\uDFFB\uDFFD-\uDFFF])|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83D[\uDC68\uDC69]\uD83C[\uDFFB\uDFFD-\uDFFF]|\uDEEF\u200D\uD83D\uDC69\uD83C[\uDFFB\uDFFD-\uDFFF])))?|\uDFFD(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:[\uDC68\uDC69]|\uDC8B\u200D\uD83D[\uDC68\uDC69])\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83D\uDC69\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF])|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83D[\uDC68\uDC69]\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF]|\uDEEF\u200D\uD83D\uDC69\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF])))?|\uDFFE(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:[\uDC68\uDC69]|\uDC8B\u200D\uD83D[\uDC68\uDC69])\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83D\uDC69\uD83C[\uDFFB-\uDFFD\uDFFF])|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83D[\uDC68\uDC69]\uD83C[\uDFFB-\uDFFD\uDFFF]|\uDEEF\u200D\uD83D\uDC69\uD83C[\uDFFB-\uDFFD\uDFFF])))?|\uDFFF(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:[\uDC68\uDC69]|\uDC8B\u200D\uD83D[\uDC68\uDC69])\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83D\uDC69\uD83C[\uDFFB-\uDFFE])|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83D[\uDC68\uDC69]\uD83C[\uDFFB-\uDFFE]|\uDEEF\u200D\uD83D\uDC69\uD83C[\uDFFB-\uDFFE])))?))?|\uDD75(?:\uD83C[\uDFFB-\uDFFF]|\uFE0F)?(?:\u200D[\u2640\u2642]\uFE0F?)?|\uDE2E(?:\u200D\uD83D\uDCA8)?|\uDE35(?:\u200D\uD83D\uDCAB)?|\uDE36(?:\u200D\uD83C\uDF2B\uFE0F?)?|\uDE42(?:\u200D[\u2194\u2195]\uFE0F?)?|\uDEB6(?:\uD83C[\uDFFB-\uDFFF])?(?:\u200D(?:[\u2640\u2642]\uFE0F?(?:\u200D\u27A1\uFE0F?)?|\u27A1\uFE0F?))?)|\uD83E(?:[\uDD0C\uDD0F\uDD18-\uDD1F\uDD30-\uDD34\uDD36\uDD77\uDDB5\uDDB6\uDDBB\uDDD2\uDDD3\uDDD5\uDEC3-\uDEC5\uDEF0\uDEF2-\uDEF8](?:\uD83C[\uDFFB-\uDFFF])?|[\uDD26\uDD35\uDD37-\uDD39\uDD3C-\uDD3E\uDDB8\uDDB9\uDDCD\uDDCF\uDDD4\uDDD6-\uDDDD](?:\uD83C[\uDFFB-\uDFFF])?(?:\u200D[\u2640\u2642]\uFE0F?)?|[\uDDDE\uDDDF](?:\u200D[\u2640\u2642]\uFE0F?)?|[\uDD0D\uDD0E\uDD10-\uDD17\uDD20-\uDD25\uDD27-\uDD2F\uDD3A\uDD3F-\uDD45\uDD47-\uDD76\uDD78-\uDDB4\uDDB7\uDDBA\uDDBC-\uDDCC\uDDD0\uDDE0-\uDDFF\uDE70-\uDE7C\uDE80-\uDE8A\uDE8E-\uDEC2\uDEC6\uDEC8\uDECD-\uDEDC\uDEDF-\uDEEA\uDEEF]|\uDDCE(?:\uD83C[\uDFFB-\uDFFF])?(?:\u200D(?:[\u2640\u2642]\uFE0F?(?:\u200D\u27A1\uFE0F?)?|\u27A1\uFE0F?))?|\uDDD1(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3\uDE70]|\uDD1D\u200D\uD83E\uDDD1|\uDDD1\u200D\uD83E\uDDD2(?:\u200D\uD83E\uDDD2)?|\uDDD2(?:\u200D\uD83E\uDDD2)?))|\uD83C(?:\uDFFB(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1\uD83C[\uDFFC-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83E\uDDD1\uD83C[\uDFFC-\uDFFF])|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3\uDE70]|\uDD1D\u200D\uD83E\uDDD1\uD83C[\uDFFB-\uDFFF]|\uDEEF\u200D\uD83E\uDDD1\uD83C[\uDFFC-\uDFFF])))?|\uDFFC(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1\uD83C[\uDFFB\uDFFD-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83E\uDDD1\uD83C[\uDFFB\uDFFD-\uDFFF])|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3\uDE70]|\uDD1D\u200D\uD83E\uDDD1\uD83C[\uDFFB-\uDFFF]|\uDEEF\u200D\uD83E\uDDD1\uD83C[\uDFFB\uDFFD-\uDFFF])))?|\uDFFD(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83E\uDDD1\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF])|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3\uDE70]|\uDD1D\u200D\uD83E\uDDD1\uD83C[\uDFFB-\uDFFF]|\uDEEF\u200D\uD83E\uDDD1\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF])))?|\uDFFE(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1\uD83C[\uDFFB-\uDFFD\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83E\uDDD1\uD83C[\uDFFB-\uDFFD\uDFFF])|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3\uDE70]|\uDD1D\u200D\uD83E\uDDD1\uD83C[\uDFFB-\uDFFF]|\uDEEF\u200D\uD83E\uDDD1\uD83C[\uDFFB-\uDFFD\uDFFF])))?|\uDFFF(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1\uD83C[\uDFFB-\uDFFE]|\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83E\uDDD1\uD83C[\uDFFB-\uDFFE])|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3\uDE70]|\uDD1D\u200D\uD83E\uDDD1\uD83C[\uDFFB-\uDFFF]|\uDEEF\u200D\uD83E\uDDD1\uD83C[\uDFFB-\uDFFE])))?))?|\uDEF1(?:\uD83C(?:\uDFFB(?:\u200D\uD83E\uDEF2\uD83C[\uDFFC-\uDFFF])?|\uDFFC(?:\u200D\uD83E\uDEF2\uD83C[\uDFFB\uDFFD-\uDFFF])?|\uDFFD(?:\u200D\uD83E\uDEF2\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF])?|\uDFFE(?:\u200D\uD83E\uDEF2\uD83C[\uDFFB-\uDFFD\uDFFF])?|\uDFFF(?:\u200D\uD83E\uDEF2\uD83C[\uDFFB-\uDFFE])?))?)/g;function zt(e){return e===12288||e>=65281&&e<=65376||e>=65504&&e<=65510}function Jt(e){return e>=4352&&e<=4447||e===8986||e===8987||e===9001||e===9002||e>=9193&&e<=9196||e===9200||e===9203||e===9725||e===9726||e===9748||e===9749||e>=9776&&e<=9783||e>=9800&&e<=9811||e===9855||e>=9866&&e<=9871||e===9875||e===9889||e===9898||e===9899||e===9917||e===9918||e===9924||e===9925||e===9934||e===9940||e===9962||e===9970||e===9971||e===9973||e===9978||e===9981||e===9989||e===9994||e===9995||e===10024||e===10060||e===10062||e>=10067&&e<=10069||e===10071||e>=10133&&e<=10135||e===10160||e===10175||e===11035||e===11036||e===11088||e===11093||e>=11904&&e<=11929||e>=11931&&e<=12019||e>=12032&&e<=12245||e>=12272&&e<=12287||e>=12289&&e<=12350||e>=12353&&e<=12438||e>=12441&&e<=12543||e>=12549&&e<=12591||e>=12593&&e<=12686||e>=12688&&e<=12773||e>=12783&&e<=12830||e>=12832&&e<=12871||e>=12880&&e<=42124||e>=42128&&e<=42182||e>=43360&&e<=43388||e>=44032&&e<=55203||e>=63744&&e<=64255||e>=65040&&e<=65049||e>=65072&&e<=65106||e>=65108&&e<=65126||e>=65128&&e<=65131||e>=94176&&e<=94180||e>=94192&&e<=94198||e>=94208&&e<=101589||e>=101631&&e<=101662||e>=101760&&e<=101874||e>=110576&&e<=110579||e>=110581&&e<=110587||e===110589||e===110590||e>=110592&&e<=110882||e===110898||e>=110928&&e<=110930||e===110933||e>=110948&&e<=110951||e>=110960&&e<=111355||e>=119552&&e<=119638||e>=119648&&e<=119670||e===126980||e===127183||e===127374||e>=127377&&e<=127386||e>=127488&&e<=127490||e>=127504&&e<=127547||e>=127552&&e<=127560||e===127568||e===127569||e>=127584&&e<=127589||e>=127744&&e<=127776||e>=127789&&e<=127797||e>=127799&&e<=127868||e>=127870&&e<=127891||e>=127904&&e<=127946||e>=127951&&e<=127955||e>=127968&&e<=127984||e===127988||e>=127992&&e<=128062||e===128064||e>=128066&&e<=128252||e>=128255&&e<=128317||e>=128331&&e<=128334||e>=128336&&e<=128359||e===128378||e===128405||e===128406||e===128420||e>=128507&&e<=128591||e>=128640&&e<=128709||e===128716||e>=128720&&e<=128722||e>=128725&&e<=128728||e>=128732&&e<=128735||e===128747||e===128748||e>=128756&&e<=128764||e>=128992&&e<=129003||e===129008||e>=129292&&e<=129338||e>=129340&&e<=129349||e>=129351&&e<=129535||e>=129648&&e<=129660||e>=129664&&e<=129674||e>=129678&&e<=129734||e===129736||e>=129741&&e<=129756||e>=129759&&e<=129770||e>=129775&&e<=129784||e>=131072&&e<=196605||e>=196608&&e<=262141}var cr="\xA9\xAE\u203C\u2049\u2122\u2139\u2194\u2195\u2196\u2197\u2198\u2199\u21A9\u21AA\u2328\u23CF\u23F1\u23F2\u23F8\u23F9\u23FA\u25AA\u25AB\u25B6\u25C0\u25FB\u25FC\u2600\u2601\u2602\u2603\u2604\u260E\u2611\u2618\u261D\u2620\u2622\u2623\u2626\u262A\u262E\u262F\u2638\u2639\u263A\u2640\u2642\u265F\u2660\u2663\u2665\u2666\u2668\u267B\u267E\u2692\u2694\u2695\u2696\u2697\u2699\u269B\u269C\u26A0\u26A7\u26B0\u26B1\u26C8\u26CF\u26D1\u26D3\u26E9\u26F1\u26F7\u26F8\u26F9\u2702\u2708\u2709\u270C\u270D\u270F\u2712\u2714\u2716\u271D\u2721\u2733\u2734\u2744\u2747\u2763\u2764\u27A1\u2934\u2935\u2B05\u2B06\u2B07";var To=/[^\x20-\x7F]/u,No=new Set(cr);function So(e){if(!e)return 0;if(!To.test(e))return e.length;e=e.replace(Dr(),u=>No.has(u)?" ":"  ");let t=0;for(let u of e){let r=u.codePointAt(0);r<=31||r>=127&&r<=159||r>=768&&r<=879||r>=65024&&r<=65039||(t+=zt(r)||Jt(r)?2:1);}return t}var Re=So;var wo={type:0},Oo={type:1},Ht={value:"",length:0,queue:[],get root(){return Ht}};function fr(e,t,u){let r=t.type===1?e.queue.slice(0,-1):[...e.queue,t],o="",n=0,a=0,s=0;for(let p of r)switch(p.type){case 0:f(),u.useTabs?i(1):D(u.tabWidth);break;case 3:{let{string:F}=p;f(),o+=F,n+=F.length;break}case 2:{let{width:F}=p;a+=1,s+=F;break}default:throw new Error(`Unexpected indent comment '${p.type}'.`)}return d(),{...e,value:o,length:n,queue:r};function i(p){o+="	".repeat(p),n+=u.tabWidth*p;}function D(p){o+=" ".repeat(p),n+=p;}function f(){u.useTabs?l():d();}function l(){a>0&&i(a),c();}function d(){s>0&&D(s),c();}function c(){a=0,s=0;}}function lr(e,t,u){if(!t)return e;if(t.type==="root")return {...e,root:e};if(t===Number.NEGATIVE_INFINITY)return e.root;let r;return typeof t=="number"?t<0?r=Oo:r={type:2,width:t}:r={type:3,string:t},fr(e,r,u)}function dr(e,t){return fr(e,wo,t)}function Po(e){let t=0;for(let u=e.length-1;u>=0;u--){let r=e[u];if(r===" "||r==="	")t++;else break}return t}function Xt(e){let t=Po(e);return {text:t===0?e:e.slice(0,e.length-t),count:t}}var W=Symbol("MODE_BREAK"),q=Symbol("MODE_FLAT"),qt=Symbol("DOC_FILL_PRINTED_LENGTH");function rt(e,t,u,r,o,n){if(u===Number.POSITIVE_INFINITY)return  true;let a=t.length,s=false,i=[e],D="";for(;u>=0;){if(i.length===0){if(a===0)return  true;i.push(t[--a]);continue}let{mode:f,doc:l}=i.pop(),d=H(l);switch(d){case G:l&&(s&&(D+=" ",u-=1,s=false),D+=l,u-=Re(l));break;case j:case w:{let c=d===j?l:l.parts,p=l[qt]??0;for(let F=c.length-1;F>=p;F--)i.push({mode:f,doc:c[F]});break}case I:case k:case R:case O:i.push({mode:f,doc:l.contents});break;case v:{let{text:c,count:p}=Xt(D);D=c,u+=p;break}case x:{if(n&&l.break)return  false;let c=l.break?W:f,p=l.expandedStates&&c===W?b(0,l.expandedStates,-1):l.contents;i.push({mode:c,doc:p});break}case B:{let p=(l.groupId?o[l.groupId]||q:f)===W?l.breakContents:l.flatContents;p&&i.push({mode:f,doc:p});break}case _:if(f===W||l.hard)return  true;l.soft||(s=true);break;case L:r=true;break;case M:if(r)return  false;break}}return  false}function Ce(e,t){let u=Object.create(null),r=t.printWidth,o=Se(t.endOfLine),n=0,a=[{indent:Ht,mode:W,doc:e}],s="",i=false,D=[],f=[],l=[],d=[],c=0;for(Gu(e);a.length>0;){let{indent:m,mode:h,doc:E}=a.pop();switch(H(E)){case G:{let g=o!==`
`?oe(0,E,`
`,o):E;g&&(s+=g,a.length>0&&(n+=Re(g)));break}case j:for(let g=E.length-1;g>=0;g--)a.push({indent:m,mode:h,doc:E[g]});break;case U:if(f.length>=2)throw new Error("There are too many 'cursor' in doc.");f.push(c+s.length);break;case I:a.push({indent:dr(m,t),mode:h,doc:E.contents});break;case k:a.push({indent:lr(m,E.n,t),mode:h,doc:E.contents});break;case v:y();break;case x:switch(h){case q:if(!i){a.push({indent:m,mode:E.break?W:q,doc:E.contents});break}case W:{i=false;let g={indent:m,mode:q,doc:E.contents},A=r-n,J=D.length>0;if(!E.break&&rt(g,a,A,J,u))a.push(g);else if(E.expandedStates){let Q=b(0,E.expandedStates,-1);if(E.break){a.push({indent:m,mode:W,doc:Q});break}else for(let re=1;re<E.expandedStates.length+1;re++)if(re>=E.expandedStates.length){a.push({indent:m,mode:W,doc:Q});break}else {let Te=E.expandedStates[re],ne={indent:m,mode:q,doc:Te};if(rt(ne,a,A,J,u)){a.push(ne);break}}}else a.push({indent:m,mode:W,doc:E.contents});break}}E.id&&(u[E.id]=b(0,a,-1).mode);break;case w:{let g=r-n,A=E[qt]??0,{parts:J}=E,Q=J.length-A;if(Q===0)break;let re=J[A+0],Te=J[A+1],ne={indent:m,mode:q,doc:re},vt={indent:m,mode:W,doc:re},Rt=rt(ne,[],g,D.length>0,u,true);if(Q===1){Rt?a.push(ne):a.push(vt);break}let Iu={indent:m,mode:q,doc:Te},Lt={indent:m,mode:W,doc:Te};if(Q===2){Rt?a.push(Iu,ne):a.push(Lt,vt);break}let Xn=J[A+2],qn={indent:m,mode:h,doc:{...E,[qt]:A+2}},Qn=rt({indent:m,mode:q,doc:[re,Te,Xn]},[],g,D.length>0,u,true);a.push(qn),Qn?a.push(Iu,ne):Rt?a.push(Lt,ne):a.push(Lt,vt);break}case B:case R:{let g=E.groupId?u[E.groupId]:h;if(g===W){let A=E.type===B?E.breakContents:E.negate?E.contents:ae(E.contents);A&&a.push({indent:m,mode:h,doc:A});}if(g===q){let A=E.type===B?E.flatContents:E.negate?ae(E.contents):E.contents;A&&a.push({indent:m,mode:h,doc:A});}break}case L:D.push({indent:m,mode:h,doc:E.contents});break;case M:D.length>0&&a.push({indent:m,mode:h,doc:ke});break;case _:switch(h){case q:if(E.hard)i=true;else {E.soft||(s+=" ",n+=1);break}case W:if(D.length>0){a.push({indent:m,mode:h,doc:E},...D.reverse()),D.length=0;break}E.literal?(s+=o,n=0,m.root&&(m.root.value&&(s+=m.root.value),n=m.root.length)):(y(),s+=o+m.value,n=m.length);break}break;case O:a.push({indent:m,mode:h,doc:E.contents});break;case T:break;default:throw new Z(E)}a.length===0&&D.length>0&&(a.push(...D.reverse()),D.length=0);}let p=l.join("")+s,F=[...d,...f];if(F.length!==2)return {formatted:p};let C=F[0];return {formatted:p,cursorNodeStart:C,cursorNodeText:p.slice(C,b(0,F,-1))};function y(){let{text:m,count:h}=Xt(s);m&&(l.push(m),c+=m.length),s="",n-=h,f.length>0&&(d.push(...f.map(E=>Math.min(E,c))),f.length=0);}}function Io(e,t,u=0){let r=0;for(let o=u;o<e.length;++o)e[o]==="	"?r=r+t-r%t:r++;return r}var he=Io;var Qt=class{constructor(t){this.stack=[t];}get key(){let{stack:t,siblings:u}=this;return b(0,t,u===null?-2:-4)??null}get index(){return this.siblings===null?null:b(0,this.stack,-2)}get node(){return b(0,this.stack,-1)}get parent(){return this.getNode(1)}get grandparent(){return this.getNode(2)}get isInArray(){return this.siblings!==null}get siblings(){let{stack:t}=this,u=b(0,t,-3);return Array.isArray(u)?u:null}get next(){let{siblings:t}=this;return t===null?null:t[this.index+1]}get previous(){let{siblings:t}=this;return t===null?null:t[this.index-1]}get isFirst(){return this.index===0}get isLast(){let{siblings:t,index:u}=this;return t!==null&&u===t.length-1}get isRoot(){return this.stack.length===1}get root(){return this.stack[0]}get ancestors(){return [...this.#e()]}getName(){let{stack:t}=this,{length:u}=t;return u>1?b(0,t,-2):null}getValue(){return b(0,this.stack,-1)}getNode(t=0){let u=this.#t(t);return u===-1?null:this.stack[u]}getParentNode(t=0){return this.getNode(t+1)}#t(t){let{stack:u}=this;for(let r=u.length-1;r>=0;r-=2)if(!Array.isArray(u[r])&&--t<0)return r;return  -1}call(t,...u){let{stack:r}=this,{length:o}=r,n=b(0,r,-1);for(let a of u)n=n?.[a],r.push(a,n);try{return t(this)}finally{r.length=o;}}callParent(t,u=0){let r=this.#t(u+1),o=this.stack.splice(r+1);try{return t(this)}finally{this.stack.push(...o);}}each(t,...u){let{stack:r}=this,{length:o}=r,n=b(0,r,-1);for(let a of u)n=n[a],r.push(a,n);try{for(let a=0;a<n.length;++a)r.push(a,n[a]),t(this,a,n),r.length-=2;}finally{r.length=o;}}map(t,...u){let r=[];return this.each((o,n,a)=>{r[n]=t(o,n,a);},...u),r}match(...t){let u=this.stack.length-1,r=null,o=this.stack[u--];for(let n of t){if(o===void 0)return  false;let a=null;if(typeof r=="number"&&(a=r,r=this.stack[u--],o=this.stack[u--]),n&&!n(o,r,a))return  false;r=this.stack[u--],o=this.stack[u--];}return  true}findAncestor(t){for(let u of this.#e())if(t(u))return u}hasAncestor(t){for(let u of this.#e())if(t(u))return  true;return  false}*#e(){let{stack:t}=this;for(let u=t.length-3;u>=0;u-=2){let r=t[u];Array.isArray(r)||(yield r);}}},pr=Qt;function ko(e){return e!==null&&typeof e=="object"}var ge=ko;function ye(e){return (t,u,r)=>{let o=!!r?.backwards;if(u===false)return  false;let{length:n}=t,a=u;for(;a>=0&&a<n;){let s=t.charAt(a);if(e instanceof RegExp){if(!e.test(s))return a}else if(!e.includes(s))return a;o?a--:a++;}return a===-1||a===n?a:false}}var Fr=ye(/\s/u),Y=ye(" 	"),nt=ye(",; 	"),ot=ye(/[^\n\r]/u);var mr=e=>e===`
`||e==="\r"||e==="\u2028"||e==="\u2029";function vo(e,t,u){let r=!!u?.backwards;if(t===false)return  false;let o=e.charAt(t);if(r){if(e.charAt(t-1)==="\r"&&o===`
`)return t-2;if(mr(o))return t-1}else {if(o==="\r"&&e.charAt(t+1)===`
`)return t+2;if(mr(o))return t+1}return t}var K=vo;function Ro(e,t,u={}){let r=Y(e,u.backwards?t-1:t,u),o=K(e,r,u);return r!==o}var z=Ro;function Lo(e){return Array.isArray(e)&&e.length>0}var Er=Lo;function*be(e,t){let{getVisitorKeys:u,filter:r=()=>true}=t,o=n=>ge(n)&&r(n);for(let n of u(e)){let a=e[n];if(Array.isArray(a))for(let s of a)o(s)&&(yield s);else o(a)&&(yield a);}}function*Cr(e,t){let u=[e];for(let r=0;r<u.length;r++){let o=u[r];for(let n of be(o,t))yield n,u.push(n);}}function hr(e,t){return be(e,t).next().done}function gr(e,t,u){let{cache:r}=u;if(r.has(e))return r.get(e);let{filter:o}=u;if(!o)return [];let n,a=(u.getChildren?.(e,u)??[...be(e,{getVisitorKeys:u.getVisitorKeys})]).flatMap(D=>(n??(n=[e,...t]),o(D,n)?[D]:gr(D,n,u))),{locStart:s,locEnd:i}=u;return a.sort((D,f)=>s(D)-s(f)||i(D)-i(f)),r.set(e,a),a}var at=gr;function Mo(e){let t=e.type||e.kind||"(unknown type)",u=String(e.name||e.id&&(typeof e.id=="object"?e.id.name:e.id)||e.key&&(typeof e.key=="object"?e.key.name:e.key)||e.value&&(typeof e.value=="object"?"":String(e.value))||e.operator||"");return u.length>20&&(u=u.slice(0,19)+"\u2026"),t+(u?" "+u:"")}function Zt(e,t){(e.comments??(e.comments=[])).push(t),t.printed=false,t.nodeDescription=Mo(e);}function fe(e,t){t.leading=true,t.trailing=false,Zt(e,t);}function ue(e,t,u){t.leading=false,t.trailing=false,u&&(t.marker=u),Zt(e,t);}function le(e,t){t.leading=false,t.trailing=true,Zt(e,t);}var uu=new WeakMap;function br(e,t,u,r,o=[]){let{locStart:n,locEnd:a}=u,s=n(t),i=a(t),D=at(e,o,{cache:uu,locStart:n,locEnd:a,getVisitorKeys:u.getVisitorKeys,filter:u.printer.canAttachComment,getChildren:u.printer.getCommentChildNodes}),f,l,d=0,c=D.length;for(;d<c;){let p=d+c>>1,F=D[p],C=n(F),y=a(F);if(C<=s&&i<=y)return br(F,t,u,F,[F,...o]);if(y<=s){f=F,d=p+1;continue}if(i<=C){l=F,c=p;continue}throw new Error("Comment location overlaps with node location")}if(r?.type==="TemplateLiteral"){let{quasis:p}=r,F=tu(p,t,u);f&&tu(p,f,u)!==F&&(f=null),l&&tu(p,l,u)!==F&&(l=null);}return {enclosingNode:r,precedingNode:f,followingNode:l}}var eu=()=>false;function Ar(e,t){let{comments:u}=e;if(delete e.comments,!Er(u)||!t.printer.canAttachComment)return;let r=[],{printer:{features:{experimental_avoidAstMutation:o},handleComments:n={}},originalText:a}=t,{ownLine:s=eu,endOfLine:i=eu,remaining:D=eu}=n,f=u.map((l,d)=>({...br(e,l,t),comment:l,text:a,options:t,ast:e,isLastComment:u.length-1===d}));for(let[l,d]of f.entries()){let{comment:c,precedingNode:p,enclosingNode:F,followingNode:C,text:y,options:m,ast:h,isLastComment:E}=d,g;if(o?g=[d]:(c.enclosingNode=F,c.precedingNode=p,c.followingNode=C,g=[c,y,m,h,E]),Yo(y,m,f,l))c.placement="ownLine",s(...g)||(C?fe(C,c):p?le(p,c):F?ue(F,c):ue(h,c));else if(jo(y,m,f,l))c.placement="endOfLine",i(...g)||(p?le(p,c):C?fe(C,c):F?ue(F,c):ue(h,c));else if(c.placement="remaining",!D(...g))if(p&&C){let A=r.length;A>0&&r[A-1].followingNode!==C&&yr(r,m),r.push(d);}else p?le(p,c):C?fe(C,c):F?ue(F,c):ue(h,c);}if(yr(r,t),!o)for(let l of u)delete l.precedingNode,delete l.enclosingNode,delete l.followingNode;}var _r=e=>!/[\S\n\u2028\u2029]/u.test(e);function Yo(e,t,u,r){let{comment:o,precedingNode:n}=u[r],{locStart:a,locEnd:s}=t,i=a(o);if(n)for(let D=r-1;D>=0;D--){let{comment:f,precedingNode:l}=u[D];if(l!==n||!_r(e.slice(s(f),i)))break;i=a(f);}return z(e,i,{backwards:true})}function jo(e,t,u,r){let{comment:o,followingNode:n}=u[r],{locStart:a,locEnd:s}=t,i=s(o);if(n)for(let D=r+1;D<u.length;D++){let{comment:f,followingNode:l}=u[D];if(l!==n||!_r(e.slice(i,a(f))))break;i=s(f);}return z(e,i)}function yr(e,t){let u=e.length;if(u===0)return;let{precedingNode:r,followingNode:o}=e[0],n=t.locStart(o),a;for(a=u;a>0;--a){let{comment:s,precedingNode:i,followingNode:D}=e[a-1];let f=t.originalText.slice(t.locEnd(s),n);if(t.printer.isGap?.(f,t)??/^[\s(]*$/u.test(f))n=t.locStart(s);else break}for(let[s,{comment:i}]of e.entries())s<a?le(r,i):fe(o,i);for(let s of [r,o])s.comments&&s.comments.length>1&&s.comments.sort((i,D)=>t.locStart(i)-t.locStart(D));e.length=0;}function tu(e,t,u){let r=u.locStart(t)-1;for(let o=1;o<e.length;++o)if(r<u.locStart(e[o]))return o-1;return 0}function Uo(e,t){let u=t-1;u=Y(e,u,{backwards:true}),u=K(e,u,{backwards:true}),u=Y(e,u,{backwards:true});let r=K(e,u,{backwards:true});return u!==r}var Le=Uo;function xr(e,t){let u=e.node;return u.printed=true,t.printer.printComment(e,t)}function Wo(e,t){let u=e.node,r=[xr(e,t)],{printer:o,originalText:n,locStart:a,locEnd:s}=t;if(o.isBlockComment?.(u)){let f=z(n,s(u))?z(n,a(u),{backwards:true})?V:ut:" ";r.push(f);}else r.push(V);let D=K(n,Y(n,s(u)));return D!==false&&z(n,D)&&r.push(V),r}function $o(e,t,u){let r=e.node,o=xr(e,t),{printer:n,originalText:a,locStart:s}=t,i=n.isBlockComment?.(r);if(u?.hasLineSuffix&&!u?.isBlock||z(a,s(r),{backwards:true})){let D=Le(a,s(r));return {doc:ve([V,D?V:"",o]),isBlock:i,hasLineSuffix:true}}return !i||u?.hasLineSuffix?{doc:[ve([" ",o]),ce],isBlock:i,hasLineSuffix:true}:{doc:[" ",o],isBlock:i,hasLineSuffix:false}}function Vo(e,t){let u=e.node;if(!u)return {};let r=t[Symbol.for("printedComments")];if((u.comments||[]).filter(i=>!r.has(i)).length===0)return {leading:"",trailing:""};let n=[],a=[],s;return e.each(()=>{let i=e.node;if(r?.has(i))return;let{leading:D,trailing:f}=i;D?n.push(Wo(e,t)):f&&(s=$o(e,t,s),a.push(s.doc));},"comments"),{leading:n,trailing:a}}function Br(e,t,u){let{leading:r,trailing:o}=Vo(e,u);return !r&&!o?t:Ee(t,n=>[r,n,o])}function Tr(e){let{[Symbol.for("comments")]:t,[Symbol.for("printedComments")]:u}=e;for(let r of t){if(!r.printed&&!u.has(r))throw new Error('Comment "'+r.value.trim()+'" was not printed. Please report this error!');delete r.printed;}}var Me=class extends Error{name="ConfigError"},Ye=class extends Error{name="UndefinedParserError"};var Sr={checkIgnorePragma:{category:"Special",type:"boolean",default:false,description:"Check whether the file's first docblock comment contains '@noprettier' or '@noformat' to determine if it should be formatted.",cliCategory:"Other"},cursorOffset:{category:"Special",type:"int",default:-1,range:{start:-1,end:1/0,step:1},description:"Print (to stderr) where a cursor at the given position would move to after formatting.",cliCategory:"Editor"},endOfLine:{category:"Global",type:"choice",default:"lf",description:"Which end of line characters to apply.",choices:[{value:"lf",description:"Line Feed only (\\n), common on Linux and macOS as well as inside git repos"},{value:"crlf",description:"Carriage Return + Line Feed characters (\\r\\n), common on Windows"},{value:"cr",description:"Carriage Return character only (\\r), used very rarely"},{value:"auto",description:`Maintain existing
(mixed values within one file are normalised by looking at what's used after the first line)`}]},filepath:{category:"Special",type:"path",description:"Specify the input filepath. This will be used to do parser inference.",cliName:"stdin-filepath",cliCategory:"Other",cliDescription:"Path to the file to pretend that stdin comes from."},insertPragma:{category:"Special",type:"boolean",default:false,description:"Insert @format pragma into file's first docblock comment.",cliCategory:"Other"},parser:{category:"Global",type:"choice",default:void 0,description:"Which parser to use.",exception:e=>typeof e=="string"||typeof e=="function",choices:[{value:"flow",description:"Flow"},{value:"babel",description:"JavaScript"},{value:"babel-flow",description:"Flow"},{value:"babel-ts",description:"TypeScript"},{value:"typescript",description:"TypeScript"},{value:"acorn",description:"JavaScript"},{value:"espree",description:"JavaScript"},{value:"meriyah",description:"JavaScript"},{value:"css",description:"CSS"},{value:"less",description:"Less"},{value:"scss",description:"SCSS"},{value:"json",description:"JSON"},{value:"json5",description:"JSON5"},{value:"jsonc",description:"JSON with Comments"},{value:"json-stringify",description:"JSON.stringify"},{value:"graphql",description:"GraphQL"},{value:"markdown",description:"Markdown"},{value:"mdx",description:"MDX"},{value:"vue",description:"Vue"},{value:"yaml",description:"YAML"},{value:"glimmer",description:"Ember / Handlebars"},{value:"html",description:"HTML"},{value:"angular",description:"Angular"},{value:"lwc",description:"Lightning Web Components"},{value:"mjml",description:"MJML"}]},plugins:{type:"path",array:true,default:[{value:[]}],category:"Global",description:"Add a plugin. Multiple plugins can be passed as separate `--plugin`s.",exception:e=>typeof e=="string"||typeof e=="object",cliName:"plugin",cliCategory:"Config"},printWidth:{category:"Global",type:"int",default:80,description:"The line length where Prettier will try wrap.",range:{start:0,end:1/0,step:1}},rangeEnd:{category:"Special",type:"int",default:1/0,range:{start:0,end:1/0,step:1},description:`Format code ending at a given character offset (exclusive).
The range will extend forwards to the end of the selected statement.`,cliCategory:"Editor"},rangeStart:{category:"Special",type:"int",default:0,range:{start:0,end:1/0,step:1},description:`Format code starting at a given character offset.
The range will extend backwards to the start of the first line containing the selected statement.`,cliCategory:"Editor"},requirePragma:{category:"Special",type:"boolean",default:false,description:"Require either '@prettier' or '@format' to be present in the file's first docblock comment in order for it to be formatted.",cliCategory:"Other"},tabWidth:{type:"int",category:"Global",default:2,description:"Number of spaces per indentation level.",range:{start:0,end:1/0,step:1}},useTabs:{category:"Global",type:"boolean",default:false,description:"Indent with tabs instead of spaces."},embeddedLanguageFormatting:{category:"Global",type:"choice",default:"auto",description:"Control how Prettier formats quoted code embedded in the file.",choices:[{value:"auto",description:"Format embedded code if Prettier can automatically identify it."},{value:"off",description:"Never automatically format embedded code."}]}};function it({plugins:e=[],showDeprecated:t=false}={}){let u=e.flatMap(o=>o.languages??[]),r=[];for(let o of Go(Object.assign({},...e.map(({options:n})=>n),Sr)))!t&&o.deprecated||(Array.isArray(o.choices)&&(t||(o.choices=o.choices.filter(n=>!n.deprecated)),o.name==="parser"&&(o.choices=[...o.choices,...Ko(o.choices,u,e)])),o.pluginDefaults=Object.fromEntries(e.filter(n=>n.defaultOptions?.[o.name]!==void 0).map(n=>[n.name,n.defaultOptions[o.name]])),r.push(o));return {languages:u,options:r}}function*Ko(e,t,u){let r=new Set(e.map(o=>o.value));for(let o of t)if(o.parsers){for(let n of o.parsers)if(!r.has(n)){r.add(n);let a=u.find(i=>i.parsers&&Object.prototype.hasOwnProperty.call(i.parsers,n)),s=o.name;a?.name&&(s+=` (plugin: ${a.name})`),yield {value:n,description:s};}}}function Go(e){let t=[];for(let[u,r]of Object.entries(e)){let o={name:u,...r};Array.isArray(o.default)&&(o.default=b(0,o.default,-1).value),t.push(o);}return t}var zo=Array.prototype.toReversed??function(){return [...this].reverse()},Jo=X("toReversed",function(){if(Array.isArray(this))return zo}),wr=Jo;function Ho(){let e=globalThis,t=e.Deno?.build?.os;return typeof t=="string"?t==="windows":e.navigator?.platform?.startsWith("Win")??e.process?.platform?.startsWith("win")??false}var Xo=Ho();function Or(e){if(e=e instanceof URL?e:new URL(e),e.protocol!=="file:")throw new TypeError(`URL must be a file URL: received "${e.protocol}"`);return e}function qo(e){return e=Or(e),decodeURIComponent(e.pathname.replace(/%(?![0-9A-Fa-f]{2})/g,"%25"))}function Qo(e){e=Or(e);let t=decodeURIComponent(e.pathname.replace(/\//g,"\\").replace(/%(?![0-9A-Fa-f]{2})/g,"%25")).replace(/^\\*([A-Za-z]:)(\\|$)/,"$1\\");return e.hostname!==""&&(t=`\\\\${e.hostname}${t}`),t}function ru(e){return Xo?Qo(e):qo(e)}var Pr=e=>String(e).split(/[/\\]/u).pop(),Ir=e=>String(e).startsWith("file:");function kr(e,t){if(!t)return;let u=Pr(t).toLowerCase();return e.find(({filenames:r})=>r?.some(o=>o.toLowerCase()===u))??e.find(({extensions:r})=>r?.some(o=>u.endsWith(o)))}function Zo(e,t){if(t)return e.find(({name:u})=>u.toLowerCase()===t)??e.find(({aliases:u})=>u?.includes(t))??e.find(({extensions:u})=>u?.includes(`.${t}`))}var ea=void 0;function vr(e,t){if(t){if(Ir(t))try{t=ru(t);}catch{return}if(typeof t=="string")return e.find(({isSupported:u})=>u?.({filepath:t}))}}function ta(e,t){let u=wr(0,e.plugins).flatMap(o=>o.languages??[]);return (Zo(u,t.language)??kr(u,t.physicalFile)??kr(u,t.file)??vr(u,t.physicalFile)??vr(u,t.file)??ea?.(u,t.physicalFile))?.parsers[0]}var st=ta;var ie={key:e=>/^[$_a-zA-Z][$_a-zA-Z0-9]*$/.test(e)?e:JSON.stringify(e),value(e){if(e===null||typeof e!="object")return JSON.stringify(e);if(Array.isArray(e))return `[${e.map(u=>ie.value(u)).join(", ")}]`;let t=Object.keys(e);return t.length===0?"{}":`{ ${t.map(u=>`${ie.key(u)}: ${ie.value(e[u])}`).join(", ")} }`},pair:({key:e,value:t})=>ie.value({[e]:t})};var nu=new Proxy(String,{get:()=>nu}),$=nu,ou=()=>nu;var Rr=(e,t,{descriptor:u})=>{let r=[`${$.yellow(typeof e=="string"?u.key(e):u.pair(e))} is deprecated`];return t&&r.push(`we now treat it as ${$.blue(typeof t=="string"?u.key(t):u.pair(t))}`),r.join("; ")+"."};var Dt=Symbol.for("vnopts.VALUE_NOT_EXIST"),Ae=Symbol.for("vnopts.VALUE_UNCHANGED");var Lr=" ".repeat(2),Yr=(e,t,u)=>{let{text:r,list:o}=u.normalizeExpectedResult(u.schemas[e].expected(u)),n=[];return r&&n.push(Mr(e,t,r,u.descriptor)),o&&n.push([Mr(e,t,o.title,u.descriptor)].concat(o.values.map(a=>jr(a,u.loggerPrintWidth))).join(`
`)),Ur(n,u.loggerPrintWidth)};function Mr(e,t,u,r){return [`Invalid ${$.red(r.key(e))} value.`,`Expected ${$.blue(u)},`,`but received ${t===Dt?$.gray("nothing"):$.red(r.value(t))}.`].join(" ")}function jr({text:e,list:t},u){let r=[];return e&&r.push(`- ${$.blue(e)}`),t&&r.push([`- ${$.blue(t.title)}:`].concat(t.values.map(o=>jr(o,u-Lr.length).replace(/^|\n/g,`$&${Lr}`))).join(`
`)),Ur(r,u)}function Ur(e,t){if(e.length===1)return e[0];let[u,r]=e,[o,n]=e.map(a=>a.split(`
`,1)[0].length);return o>t&&o>n?r:u}var _e=[],au=[];function ct(e,t,u){if(e===t)return 0;let r=u?.maxDistance,o=e;e.length>t.length&&(e=t,t=o);let n=e.length,a=t.length;for(;n>0&&e.charCodeAt(~-n)===t.charCodeAt(~-a);)n--,a--;let s=0;for(;s<n&&e.charCodeAt(s)===t.charCodeAt(s);)s++;if(n-=s,a-=s,r!==void 0&&a-n>r)return r;if(n===0)return r!==void 0&&a>r?r:a;let i,D,f,l,d=0,c=0;for(;d<n;)au[d]=e.charCodeAt(s+d),_e[d]=++d;for(;c<a;){for(i=t.charCodeAt(s+c),f=c++,D=c,d=0;d<n;d++)l=i===au[d]?f:f+1,f=_e[d],D=_e[d]=f>D?l>D?D+1:l:l>f?f+1:l;if(r!==void 0){let p=D;for(d=0;d<n;d++)_e[d]<p&&(p=_e[d]);if(p>r)return r}}return _e.length=n,au.length=n,r!==void 0&&D>r?r:D}function Wr(e,t,u){if(!Array.isArray(t)||t.length===0)return;let r=u?.maxDistance,o=e.length;for(let i of t)if(i===e)return i;let n,a=Number.POSITIVE_INFINITY,s=new Set;for(let i of t){if(s.has(i))continue;s.add(i);let D=Math.abs(i.length-o);if(D>=a||D>r)continue;let f=Number.isFinite(a)?Math.min(a,r):r,l=f===void 0?ct(e,i):ct(e,i,{maxDistance:f});if(l>r)continue;let d=l;if(f!==void 0&&l===f&&f===r&&(d=ct(e,i)),d<a&&(a=d,n=i,a===0))break}if(!(a>r))return n}var ft=(e,t,{descriptor:u,logger:r,schemas:o})=>{let n=[`Ignored unknown option ${$.yellow(u.pair({key:e,value:t}))}.`],a=Wr(e,Object.keys(o),{maxDistance:3});a&&n.push(`Did you mean ${$.blue(u.key(a))}?`),r.warn(n.join(" "));};var ua=["default","expected","validate","deprecated","forward","redirect","overlap","preprocess","postprocess"];function ra(e,t){let u=new e(t),r=Object.create(u);for(let o of ua)o in t&&(r[o]=na(t[o],u,S.prototype[o].length));return r}var S=class{static create(t){return ra(this,t)}constructor(t){this.name=t.name;}default(t){}expected(t){return "nothing"}validate(t,u){return  false}deprecated(t,u){return  false}forward(t,u){}redirect(t,u){}overlap(t,u,r){return t}preprocess(t,u){return t}postprocess(t,u){return Ae}};function na(e,t,u){return typeof e=="function"?(...r)=>e(...r.slice(0,u-1),t,...r.slice(u-1)):()=>e}var lt=class extends S{constructor(t){super(t),this._sourceName=t.sourceName;}expected(t){return t.schemas[this._sourceName].expected(t)}validate(t,u){return u.schemas[this._sourceName].validate(t,u)}redirect(t,u){return this._sourceName}};var dt=class extends S{expected(){return "anything"}validate(){return  true}};var pt=class extends S{constructor({valueSchema:t,name:u=t.name,...r}){super({...r,name:u}),this._valueSchema=t;}expected(t){let{text:u,list:r}=t.normalizeExpectedResult(this._valueSchema.expected(t));return {text:u&&`an array of ${u}`,list:r&&{title:"an array of the following values",values:[{list:r}]}}}validate(t,u){if(!Array.isArray(t))return  false;let r=[];for(let o of t){let n=u.normalizeValidateResult(this._valueSchema.validate(o,u),o);n!==true&&r.push(n.value);}return r.length===0?true:{value:r}}deprecated(t,u){let r=[];for(let o of t){let n=u.normalizeDeprecatedResult(this._valueSchema.deprecated(o,u),o);n!==false&&r.push(...n.map(({value:a})=>({value:[a]})));}return r}forward(t,u){let r=[];for(let o of t){let n=u.normalizeForwardResult(this._valueSchema.forward(o,u),o);r.push(...n.map($r));}return r}redirect(t,u){let r=[],o=[];for(let n of t){let a=u.normalizeRedirectResult(this._valueSchema.redirect(n,u),n);"remain"in a&&r.push(a.remain),o.push(...a.redirect.map($r));}return r.length===0?{redirect:o}:{redirect:o,remain:r}}overlap(t,u){return t.concat(u)}};function $r({from:e,to:t}){return {from:[e],to:t}}var Ft=class extends S{expected(){return "true or false"}validate(t){return typeof t=="boolean"}};function Kr(e,t){let u=Object.create(null);for(let r of e){let o=r[t];if(u[o])throw new Error(`Duplicate ${t} ${JSON.stringify(o)}`);u[o]=r;}return u}function Gr(e,t){let u=new Map;for(let r of e){let o=r[t];if(u.has(o))throw new Error(`Duplicate ${t} ${JSON.stringify(o)}`);u.set(o,r);}return u}function zr(){let e=Object.create(null);return t=>{let u=JSON.stringify(t);return e[u]?true:(e[u]=true,false)}}function Jr(e,t){let u=[],r=[];for(let o of e)t(o)?u.push(o):r.push(o);return [u,r]}function Hr(e){return e===Math.floor(e)}function Xr(e,t){if(e===t)return 0;let u=typeof e,r=typeof t,o=["undefined","object","boolean","number","string"];return u!==r?o.indexOf(u)-o.indexOf(r):u!=="string"?Number(e)-Number(t):e.localeCompare(t)}function qr(e){return (...t)=>{let u=e(...t);return typeof u=="string"?new Error(u):u}}function iu(e){return e===void 0?{}:e}function su(e){if(typeof e=="string")return {text:e};let{text:t,list:u}=e;return oa((t||u)!==void 0,"Unexpected `expected` result, there should be at least one field."),u?{text:t,list:{title:u.title,values:u.values.map(su)}}:{text:t}}function Du(e,t){return e===true?true:e===false?{value:t}:e}function cu(e,t,u=false){return e===false?false:e===true?u?true:[{value:t}]:"value"in e?[e]:e.length===0?false:e}function Vr(e,t){return typeof e=="string"||"key"in e?{from:t,to:e}:"from"in e?{from:e.from,to:e.to}:{from:t,to:e.to}}function mt(e,t){return e===void 0?[]:Array.isArray(e)?e.map(u=>Vr(u,t)):[Vr(e,t)]}function fu(e,t){let u=mt(typeof e=="object"&&"redirect"in e?e.redirect:e,t);return u.length===0?{remain:t,redirect:u}:typeof e=="object"&&"remain"in e?{remain:e.remain,redirect:u}:{redirect:u}}function oa(e,t){if(!e)throw new Error(t)}var Et=class extends S{constructor(t){super(t),this._choices=Gr(t.choices.map(u=>u&&typeof u=="object"?u:{value:u}),"value");}expected({descriptor:t}){let u=Array.from(this._choices.keys()).map(a=>this._choices.get(a)).filter(({hidden:a})=>!a).map(a=>a.value).sort(Xr).map(t.value),r=u.slice(0,-2),o=u.slice(-2);return {text:r.concat(o.join(" or ")).join(", "),list:{title:"one of the following values",values:u}}}validate(t){return this._choices.has(t)}deprecated(t){let u=this._choices.get(t);return u&&u.deprecated?{value:t}:false}forward(t){let u=this._choices.get(t);return u?u.forward:void 0}redirect(t){let u=this._choices.get(t);return u?u.redirect:void 0}};var Ct=class extends S{expected(){return "a number"}validate(t,u){return typeof t=="number"}};var ht=class extends Ct{expected(){return "an integer"}validate(t,u){return u.normalizeValidateResult(super.validate(t,u),t)===true&&Hr(t)}};var je=class extends S{expected(){return "a string"}validate(t){return typeof t=="string"}};var Qr=ie,Zr=ft,en=Yr,tn=Rr;var gt=class{constructor(t,u){let{logger:r=console,loggerPrintWidth:o=80,descriptor:n=Qr,unknown:a=Zr,invalid:s=en,deprecated:i=tn,missing:D=()=>false,required:f=()=>false,preprocess:l=c=>c,postprocess:d=()=>Ae}=u||{};this._utils={descriptor:n,logger:r||{warn:()=>{}},loggerPrintWidth:o,schemas:Kr(t,"name"),normalizeDefaultResult:iu,normalizeExpectedResult:su,normalizeDeprecatedResult:cu,normalizeForwardResult:mt,normalizeRedirectResult:fu,normalizeValidateResult:Du},this._unknownHandler=a,this._invalidHandler=qr(s),this._deprecatedHandler=i,this._identifyMissing=(c,p)=>!(c in p)||D(c,p),this._identifyRequired=f,this._preprocess=l,this._postprocess=d,this.cleanHistory();}cleanHistory(){this._hasDeprecationWarned=zr();}normalize(t){let u={},o=[this._preprocess(t,this._utils)],n=()=>{for(;o.length!==0;){let a=o.shift(),s=this._applyNormalization(a,u);o.push(...s);}};n();for(let a of Object.keys(this._utils.schemas)){let s=this._utils.schemas[a];if(!(a in u)){let i=iu(s.default(this._utils));"value"in i&&o.push({[a]:i.value});}}n();for(let a of Object.keys(this._utils.schemas)){if(!(a in u))continue;let s=this._utils.schemas[a],i=u[a],D=s.postprocess(i,this._utils);D!==Ae&&(this._applyValidation(D,a,s),u[a]=D);}return this._applyPostprocess(u),this._applyRequiredCheck(u),u}_applyNormalization(t,u){let r=[],{knownKeys:o,unknownKeys:n}=this._partitionOptionKeys(t);for(let a of o){let s=this._utils.schemas[a],i=s.preprocess(t[a],this._utils);this._applyValidation(i,a,s);let D=({from:c,to:p})=>{r.push(typeof p=="string"?{[p]:c}:{[p.key]:p.value});},f=({value:c,redirectTo:p})=>{let F=cu(s.deprecated(c,this._utils),i,true);if(F!==false)if(F===true)this._hasDeprecationWarned(a)||this._utils.logger.warn(this._deprecatedHandler(a,p,this._utils));else for(let{value:C}of F){let y={key:a,value:C};if(!this._hasDeprecationWarned(y)){let m=typeof p=="string"?{key:p,value:C}:p;this._utils.logger.warn(this._deprecatedHandler(y,m,this._utils));}}};mt(s.forward(i,this._utils),i).forEach(D);let d=fu(s.redirect(i,this._utils),i);if(d.redirect.forEach(D),"remain"in d){let c=d.remain;u[a]=a in u?s.overlap(u[a],c,this._utils):c,f({value:c});}for(let{from:c,to:p}of d.redirect)f({value:c,redirectTo:p});}for(let a of n){let s=t[a];this._applyUnknownHandler(a,s,u,(i,D)=>{r.push({[i]:D});});}return r}_applyRequiredCheck(t){for(let u of Object.keys(this._utils.schemas))if(this._identifyMissing(u,t)&&this._identifyRequired(u))throw this._invalidHandler(u,Dt,this._utils)}_partitionOptionKeys(t){let[u,r]=Jr(Object.keys(t).filter(o=>!this._identifyMissing(o,t)),o=>o in this._utils.schemas);return {knownKeys:u,unknownKeys:r}}_applyValidation(t,u,r){let o=Du(r.validate(t,this._utils),t);if(o!==true)throw this._invalidHandler(u,o.value,this._utils)}_applyUnknownHandler(t,u,r,o){let n=this._unknownHandler(t,u,this._utils);if(n)for(let a of Object.keys(n)){if(this._identifyMissing(a,n))continue;let s=n[a];a in this._utils.schemas?o(a,s):r[a]=s;}}_applyPostprocess(t){let u=this._postprocess(t,this._utils);if(u!==Ae){if(u.delete)for(let r of u.delete)delete t[r];if(u.override){let{knownKeys:r,unknownKeys:o}=this._partitionOptionKeys(u.override);for(let n of r){let a=u.override[n];this._applyValidation(a,n,this._utils.schemas[n]),t[n]=a;}for(let n of o){let a=u.override[n];this._applyUnknownHandler(n,a,t,(s,i)=>{let D=this._utils.schemas[s];this._applyValidation(i,s,D),t[s]=i;});}}}}};var lu;function ia(e,t,{logger:u=false,isCLI:r=false,passThrough:o=false,FlagSchema:n,descriptor:a}={}){if(r){if(!n)throw new Error("'FlagSchema' option is required.");if(!a)throw new Error("'descriptor' option is required.")}else a=ie;let s=o?Array.isArray(o)?(d,c)=>o.includes(d)?{[d]:c}:void 0:(d,c)=>({[d]:c}):(d,c,p)=>{let{_:F,...C}=p.schemas;return ft(d,c,{...p,schemas:C})},i=sa(t,{isCLI:r,FlagSchema:n}),D=new gt(i,{logger:u,unknown:s,descriptor:a}),f=u!==false;f&&lu&&(D._hasDeprecationWarned=lu);let l=D.normalize(e);return f&&(lu=D._hasDeprecationWarned),l}function sa(e,{isCLI:t,FlagSchema:u}){let r=[];t&&r.push(dt.create({name:"_"}));for(let o of e)r.push(Da(o,{isCLI:t,optionInfos:e,FlagSchema:u})),o.alias&&t&&r.push(lt.create({name:o.alias,sourceName:o.name}));return r}function Da(e,{isCLI:t,optionInfos:u,FlagSchema:r}){let{name:o}=e,n={name:o},a,s={};switch(e.type){case "int":a=ht,t&&(n.preprocess=Number);break;case "string":a=je;break;case "choice":a=Et,n.choices=e.choices.map(i=>i?.redirect?{...i,redirect:{to:{key:e.name,value:i.redirect}}}:i);break;case "boolean":a=Ft;break;case "flag":a=r,n.flags=u.flatMap(i=>[i.alias,i.description&&i.name,i.oppositeDescription&&`no-${i.name}`].filter(Boolean));break;case "path":a=je;break;default:throw new Error(`Unexpected type ${e.type}`)}if(e.exception?n.validate=(i,D,f)=>e.exception(i)||D.validate(i,f):n.validate=(i,D,f)=>i===void 0||D.validate(i,f),e.redirect&&(s.redirect=i=>i?{to:typeof e.redirect=="string"?e.redirect:{key:e.redirect.option,value:e.redirect.value}}:void 0),e.deprecated&&(s.deprecated=true),t&&!e.array){let i=n.preprocess||(D=>D);n.preprocess=(D,f,l)=>f.preprocess(i(Array.isArray(D)?b(0,D,-1):D),l);}return e.array?pt.create({...t?{preprocess:i=>Array.isArray(i)?i:[i]}:{},...s,valueSchema:a.create(n)}):a.create({...n,...s})}var un=ia;var ca=Array.prototype.findLast??function(e){for(let t=this.length-1;t>=0;t--){let u=this[t];if(e(u,t,this))return u}},fa=X("findLast",function(){if(Array.isArray(this))return ca}),du=fa;var rn=Symbol.for("PRETTIER_IS_FRONT_MATTER"),pu=[];function la(e){return !!e?.[rn]}var de=la;var nn=new Set(["yaml","toml"]),Ue=({node:e})=>de(e)&&nn.has(e.language);async function Fu(e,t,u,r){let{node:o}=u,{language:n}=o;if(!nn.has(n))return;let a=o.value.trim(),s;if(a){let i=n==="yaml"?n:st(r,{language:n});if(!i)return;s=a?await e(a,{parser:i}):"";}else s=a;return et([o.startDelimiter,o.explicitLanguage??"",V,s,s?V:"",o.endDelimiter])}function da(e,t){return Ue({node:e})&&(delete t.end,delete t.raw,delete t.value),t}var mu=da;function pa({node:e}){return e.raw}var Eu=pa;var on=new Set(["tokens","comments","parent","enclosingNode","precedingNode","followingNode"]),Fa=e=>Object.keys(e).filter(t=>!on.has(t));function ma(e,t){let u=e?r=>e(r,on):Fa;return t?new Proxy(u,{apply:(r,o,n)=>de(n[0])?pu:Reflect.apply(r,o,n)}):u}var Cu=ma;function gu(e,t){if(!t)throw new Error("parserName is required.");let u=du(0,e,o=>o.parsers&&Object.prototype.hasOwnProperty.call(o.parsers,t));if(u)return u;let r=`Couldn't resolve parser "${t}".`;throw r+=" Plugins must be explicitly added to the standalone bundle.",new Me(r)}function an(e,t){if(!t)throw new Error("astFormat is required.");let u=du(0,e,o=>o.printers&&Object.prototype.hasOwnProperty.call(o.printers,t));if(u)return u;let r=`Couldn't find plugin for AST format "${t}".`;throw r+=" Plugins must be explicitly added to the standalone bundle.",new Me(r)}function We({plugins:e,parser:t}){let u=gu(e,t);return yu(u,t)}function yu(e,t){let u=e.parsers[t];return typeof u=="function"?u():u}async function sn(e,t){let u=e.printers[t],r=typeof u=="function"?await u():u;return Ea(r)}var hu=new WeakMap;function Ea(e){if(hu.has(e))return hu.get(e);let{features:t,getVisitorKeys:u,embed:r,massageAstNode:o,print:n,...a}=e;t=ya(t);let s=t.experimental_frontMatterSupport;u=Cu(u,s.massageAstNode||s.embed||s.print);let i=o;o&&s.massageAstNode&&(i=new Proxy(o,{apply(d,c,p){return mu(...p),Reflect.apply(d,c,p)}}));let D=r;if(r){let d;D=new Proxy(r,{get(c,p,F){return p==="getVisitorKeys"?(d??(d=r.getVisitorKeys?Cu(r.getVisitorKeys,s.massageAstNode||s.embed):u),d):Reflect.get(c,p,F)},apply:(c,p,F)=>s.embed&&Ue(...F)?Fu:Reflect.apply(c,p,F)});}let f=n;s.print&&(f=new Proxy(n,{apply(d,c,p){let[F]=p;return de(F.node)?Eu(F):Reflect.apply(d,c,p)}}));let l={features:t,getVisitorKeys:u,embed:D,massageAstNode:i,print:f,...a};return hu.set(e,l),l}var Ca=["clean","embed","print"],ha=Object.fromEntries(Ca.map(e=>[e,false]));function ga(e){return {...ha,...e}}function ya(e){return {experimental_avoidAstMutation:false,...e,experimental_frontMatterSupport:ga(e?.experimental_frontMatterSupport)}}var Dn={astFormat:"estree",printer:{},originalText:void 0,locStart:null,locEnd:null,getVisitorKeys:null};async function ba(e,t={}){let u={...e};if(!u.parser)if(u.filepath){if(u.parser=st(u,{physicalFile:u.filepath}),!u.parser)throw new Ye(`No parser could be inferred for file "${u.filepath}".`)}else throw new Ye("No parser and no file path given, couldn't infer a parser.");let r=it({plugins:e.plugins,showDeprecated:true}).options,o={...Dn,...Object.fromEntries(r.filter(l=>l.default!==void 0).map(l=>[l.name,l.default]))},n=gu(u.plugins,u.parser),a=await yu(n,u.parser);u.astFormat=a.astFormat,u.locEnd=a.locEnd,u.locStart=a.locStart;let s=n.printers?.[a.astFormat]?n:an(u.plugins,a.astFormat),i=await sn(s,a.astFormat);u.printer=i,u.getVisitorKeys=i.getVisitorKeys;let D=s.defaultOptions?Object.fromEntries(Object.entries(s.defaultOptions).filter(([,l])=>l!==void 0)):{},f={...o,...D};for(let[l,d]of Object.entries(f))(u[l]===null||u[l]===void 0)&&(u[l]=d);return u.parser==="json"&&(u.trailingComma="none"),un(u,r,{passThrough:Object.keys(Dn),...t})}var se=ba;ao(dn());var _u={keyword:["break","case","catch","continue","debugger","default","do","else","finally","for","function","if","return","switch","throw","try","var","const","while","with","new","this","super","class","extends","export","import","null","true","false","in","instanceof","typeof","void","delete"],strict:["implements","interface","let","package","private","protected","public","static","yield"],strictBind:["eval","arguments"]};new Set(_u.keyword);new Set(_u.strict);new Set(_u.strictBind);var It=(e,t)=>u=>e(t(u));function mn(e){return {keyword:e.cyan,capitalized:e.yellow,jsxIdentifier:e.yellow,punctuator:e.yellow,number:e.magenta,string:e.green,regex:e.magenta,comment:e.gray,invalid:It(It(e.white,e.bgRed),e.bold),gutter:e.gray,marker:It(e.red,e.bold),message:It(e.red,e.bold),reset:e.reset}}mn(ou());mn(ou());function _a(){return new Proxy({},{get:()=>e=>e})}var Fn=/\r\n|[\n\r\u2028\u2029]/;function xa(e,t,u){let r=Object.assign({column:0,line:-1},e.start),o=Object.assign({},r,e.end),{linesAbove:n=2,linesBelow:a=3}=u||{},s=r.line,i=r.column,D=o.line,f=o.column,l=Math.max(s-(n+1),0),d=Math.min(t.length,D+a);s===-1&&(l=0),D===-1&&(d=t.length);let c=D-s,p={};if(c)for(let F=0;F<=c;F++){let C=F+s;if(!i)p[C]=true;else if(F===0){let y=t[C-1].length;p[C]=[i,y-i+1];}else if(F===c)p[C]=[0,f];else {let y=t[C-F].length;p[C]=[0,y];}}else i===f?i?p[s]=[i,0]:p[s]=true:p[s]=[i,f-i];return {start:l,end:d,markerLines:p}}function En(e,t,u={}){let o=_a(),n=e.split(Fn),{start:a,end:s,markerLines:i}=xa(t,n,u),D=t.start&&typeof t.start.column=="number",f=String(s).length,d=e.split(Fn,s).slice(a,s).map((c,p)=>{let F=a+1+p,y=` ${` ${F}`.slice(-f)} |`,m=i[F],h=!i[F+1];if(m){let E="";if(Array.isArray(m)){let g=c.slice(0,Math.max(m[0]-1,0)).replace(/[^\t]/g," "),A=m[1]||1;E=[`
 `,o.gutter(y.replace(/\d/g," "))," ",g,o.marker("^").repeat(A)].join(""),h&&u.message&&(E+=" "+o.message(u.message));}return [o.marker(">"),o.gutter(y),c.length>0?` ${c}`:"",E].join("")}else return ` ${o.gutter(y)}${c.length>0?` ${c}`:""}`}).join(`
`);return u.message&&!D&&(d=`${" ".repeat(f+1)}${u.message}
${d}`),d}async function Ba(e,t){let u=await We(t),r=u.preprocess?await u.preprocess(e,t):e;t.originalText=r;let o;try{o=await u.parse(r,t,t);}catch(n){Ta(n,e);}return {text:r,ast:o}}function Ta(e,t){let{loc:u}=e;if(u){let r=En(t,u,{});throw e.message+=`
`+r,e.codeFrame=r,e}throw e}var Fe=Ba;async function Cn(e,t,u,r,o){if(u.embeddedLanguageFormatting!=="auto")return;let{printer:n}=u,{embed:a}=n;if(!a)return;if(a.length>2)throw new Error("printer.embed has too many parameters. The API changed in Prettier v3. Please update your plugin. See https://prettier.io/docs/plugins#optional-embed");let{hasPrettierIgnore:s}=n,{getVisitorKeys:i}=a,D=[];d();let f=e.stack;for(let{print:c,node:p,pathStack:F}of D)try{e.stack=F;let C=await c(l,t,e,u);C&&o.set(p,C);}catch(C){if(globalThis.PRETTIER_DEBUG)throw C}e.stack=f;function l(c,p){return Na(c,p,u,r)}function d(){let{node:c}=e;if(c===null||typeof c!="object"||s?.(e))return;for(let F of i(c))Array.isArray(c[F])?e.each(d,F):e.call(d,F);let p=a(e,u);if(p){if(typeof p=="function"){D.push({print:p,node:c,pathStack:[...e.stack]});return}o.set(c,p);}}}async function Na(e,t,u,r){let o=await se({...u,...t,parentParser:u.parser,originalText:e,cursorOffset:void 0,rangeStart:void 0,rangeEnd:void 0},{passThrough:true}),{ast:n}=await Fe(e,o),a=await r(n,o);return qe(a)}function Sa(e,t,u,r){let{originalText:o,[Symbol.for("comments")]:n,locStart:a,locEnd:s,[Symbol.for("printedComments")]:i}=t,{node:D}=e,f=a(D),l=s(D);for(let c of n)a(c)>=f&&s(c)<=l&&i.add(c);let{printPrettierIgnored:d}=t.printer;return d?d(e,t,u,r):o.slice(f,l)}var hn=Sa;async function Ge(e,t){({ast:e}=await xu(e,t));let u=new Map,r=new pr(e),n=new Map;await Cn(r,s,t,Ge,n);let a=await gn(r,t,s,void 0,n);if(Tr(t),t.cursorOffset>=0){if(t.nodeAfterCursor&&!t.nodeBeforeCursor)return [ee,a];if(t.nodeBeforeCursor&&!t.nodeAfterCursor)return [a,ee]}return a;function s(D,f){return D===void 0||D===r?i(f):Array.isArray(D)?r.call(()=>i(f),...D):r.call(()=>i(f),D)}function i(D){let f=r.node;if(f==null)return "";let l=ge(f)&&D===void 0;if(l&&u.has(f))return u.get(f);let d=gn(r,t,s,D,n);return l&&u.set(f,d),d}}function gn(e,t,u,r,o){let{node:n}=e,{printer:a}=t,s;switch(a.hasPrettierIgnore?.(e)?s=hn(e,t,u,r):o.has(n)?s=o.get(n):s=a.print(e,t,u,r),n){case t.cursorNode:s=Ee(s,i=>[ee,i,ee]);break;case t.nodeBeforeCursor:s=Ee(s,i=>[i,ee]);break;case t.nodeAfterCursor:s=Ee(s,i=>[ee,i]);break}return a.printComment&&!a.willPrintOwnComments?.(e,t)&&(s=Br(e,s,t)),s}async function xu(e,t){let u=e.comments??[];t[Symbol.for("comments")]=u,t[Symbol.for("printedComments")]=new Set,Ar(e,t);let{printer:{preprocess:r}}=t;return e=r?await r(e,t):e,{ast:e,comments:u}}function wa(e,t){let{cursorOffset:u,locStart:r,locEnd:o,getVisitorKeys:n}=t,a=c=>r(c)<=u&&o(c)>=u,s=e,i=[e];for(let c of Cr(e,{getVisitorKeys:n,filter:a}))i.push(c),s=c;if(hr(s,{getVisitorKeys:n}))return {cursorNode:s};let D,f,l=-1,d=Number.POSITIVE_INFINITY;for(;i.length>0&&(D===void 0||f===void 0);){s=i.pop();let c=D!==void 0,p=f!==void 0;for(let F of be(s,{getVisitorKeys:n})){if(!c){let C=o(F);C<=u&&C>l&&(D=F,l=C);}if(!p){let C=r(F);C>=u&&C<d&&(f=F,d=C);}}}return {nodeBeforeCursor:D,nodeAfterCursor:f}}var Bu=wa;function Oa(e,t){let{printer:u}=t,r=u.massageAstNode;if(!r)return e;let{getVisitorKeys:o}=u,{ignoredProperties:n}=r;return a(e);function a(s,i){if(!ge(s))return s;if(Array.isArray(s))return s.map(d=>a(d,i)).filter(Boolean);let D={},f=new Set(o(s));for(let d in s)!Object.prototype.hasOwnProperty.call(s,d)||n?.has(d)||(f.has(d)?D[d]=a(s[d],s):D[d]=s[d]);let l=r(s,D,i);if(l!==null)return l??D}}var yn=Oa;var Pa=Array.prototype.findLastIndex??function(e){for(let t=this.length-1;t>=0;t--){let u=this[t];if(e(u,t,this))return t}return  -1},Ia=X("findLastIndex",function(){if(Array.isArray(this))return Pa}),bn=Ia;var ka=({parser:e})=>e==="json"||e==="json5"||e==="jsonc"||e==="json-stringify";function va(e,t){return t=new Set(t),e.find(u=>xn.has(u.type)&&t.has(u))}function An(e){let t=bn(0,e,u=>u.type!=="Program"&&u.type!=="File");return t===-1?e:e.slice(0,t+1)}function Ra(e,t,{locStart:u,locEnd:r}){let[o,...n]=e,[a,...s]=t;if(o===a)return [o,a];let i=u(o);for(let f of An(s))if(u(f)>=i)a=f;else break;let D=r(a);for(let f of An(n)){if(r(f)<=D)o=f;else break;if(o===a)break}return [o,a]}function Tu(e,t,u,r,o=[],n){let{locStart:a,locEnd:s}=u,i=a(e),D=s(e);if(t>D||t<i||n==="rangeEnd"&&t===i||n==="rangeStart"&&t===D)return;let f=[e,...o],l=at(e,f,{cache:uu,locStart:a,locEnd:s,getVisitorKeys:u.getVisitorKeys,filter:u.printer.canAttachComment,getChildren:u.printer.getCommentChildNodes});for(let d of l){let c=Tu(d,t,u,r,f,n);if(c)return c}if(r(e,o[0]))return f}function La(e,t){return t!=="DeclareExportDeclaration"&&e!=="TypeParameterDeclaration"&&(e==="Directive"||e==="TypeAlias"||e==="TSExportAssignment"||e.startsWith("Declare")||e.startsWith("TSDeclare")||e.endsWith("Statement")||e.endsWith("Declaration"))}var xn=new Set(["JsonRoot","ObjectExpression","ArrayExpression","StringLiteral","NumericLiteral","BooleanLiteral","NullLiteral","UnaryExpression","TemplateLiteral"]),Ma=new Set(["OperationDefinition","FragmentDefinition","VariableDefinition","TypeExtensionDefinition","ObjectTypeDefinition","FieldDefinition","DirectiveDefinition","EnumTypeDefinition","EnumValueDefinition","InputValueDefinition","InputObjectTypeDefinition","SchemaDefinition","OperationTypeDefinition","InterfaceTypeDefinition","UnionTypeDefinition","ScalarTypeDefinition"]);function _n(e,t,u){if(!t)return  false;switch(e.parser){case "flow":case "hermes":case "babel":case "babel-flow":case "babel-ts":case "typescript":case "acorn":case "espree":case "meriyah":case "oxc":case "oxc-ts":case "__babel_estree":return La(t.type,u?.type);case "json":case "json5":case "jsonc":case "json-stringify":return xn.has(t.type);case "graphql":return Ma.has(t.kind);case "vue":return t.tag!=="root"}return  false}function Bn(e,t,u){let{rangeStart:r,rangeEnd:o,locStart:n,locEnd:a}=t;let s=e.slice(r,o).search(/\S/u),i=s===-1;if(!i)for(r+=s;o>r&&!/\S/u.test(e[o-1]);--o);let D=Tu(u,r,t,(c,p)=>_n(t,c,p),[],"rangeStart");if(!D)return;let f=i?D:Tu(u,o,t,c=>_n(t,c),[],"rangeEnd");if(!f)return;let l,d;if(ka(t)){let c=va(D,f);l=c,d=c;}else [l,d]=Ra(D,f,t);return [Math.min(n(l),n(d)),Math.max(a(l),a(d))]}var wn="\uFEFF",Tn=Symbol("cursor");async function On(e,t,u=0){if(!e||e.trim().length===0)return {formatted:"",cursorOffset:-1,comments:[]};let{ast:r,text:o}=await Fe(e,t);t.cursorOffset>=0&&(t={...t,...Bu(r,t)});let n=await Ge(r,t);u>0&&(n=tt([V,n],u,t.tabWidth));let a=Ce(n,t);if(u>0){let i=a.formatted.trim();a.cursorNodeStart!==void 0&&(a.cursorNodeStart-=a.formatted.indexOf(i),a.cursorNodeStart<0&&(a.cursorNodeStart=0,a.cursorNodeText=a.cursorNodeText.trimStart()),a.cursorNodeStart+a.cursorNodeText.length>i.length&&(a.cursorNodeText=a.cursorNodeText.trimEnd())),a.formatted=i+Se(t.endOfLine);}let s=t[Symbol.for("comments")];if(t.cursorOffset>=0){let i,D,f,l;if((t.cursorNode||t.nodeBeforeCursor||t.nodeAfterCursor)&&a.cursorNodeText)if(f=a.cursorNodeStart,l=a.cursorNodeText,t.cursorNode)i=t.locStart(t.cursorNode),D=o.slice(i,t.locEnd(t.cursorNode));else {if(!t.nodeBeforeCursor&&!t.nodeAfterCursor)throw new Error("Cursor location must contain at least one of cursorNode, nodeBeforeCursor, nodeAfterCursor");i=t.nodeBeforeCursor?t.locEnd(t.nodeBeforeCursor):0;let y=t.nodeAfterCursor?t.locStart(t.nodeAfterCursor):o.length;D=o.slice(i,y);}else i=0,D=o,f=0,l=a.formatted;let d=t.cursorOffset-i;if(D===l)return {formatted:a.formatted,cursorOffset:f+d,comments:s};let c=D.split("");c.splice(d,0,Tn);let p=l.split(""),F=Ut(c,p),C=f;for(let y of F)if(y.removed){if(y.value.includes(Tn))break}else C+=y.count;return {formatted:a.formatted,cursorOffset:C,comments:s}}return {formatted:a.formatted,cursorOffset:-1,comments:s}}async function Ya(e,t){let{ast:u,text:r}=await Fe(e,t),[o,n]=Bn(r,t,u)??[0,0],a=r.slice(o,n),s=Math.min(o,r.lastIndexOf(`
`,o)+1),i=r.slice(s,o).match(/^\s*/u)[0],D=he(i,t.tabWidth),f=await On(a,{...t,rangeStart:0,rangeEnd:Number.POSITIVE_INFINITY,cursorOffset:t.cursorOffset>o&&t.cursorOffset<=n?t.cursorOffset-o:-1,endOfLine:"lf"},D),l=f.formatted.trimEnd(),{cursorOffset:d}=t;d>n?d+=l.length-a.length:f.cursorOffset>=0&&(d=f.cursorOffset+o);let c=r.slice(0,o)+l+r.slice(n);if(t.endOfLine!=="lf"){let p=Se(t.endOfLine);d>=0&&p===`\r
`&&(d+=$t(c.slice(0,d),`
`)),c=oe(0,c,`
`,p);}return {formatted:c,cursorOffset:d,comments:f.comments}}function Nu(e,t,u){return typeof t!="number"||Number.isNaN(t)||t<0||t>e.length?u:t}function Nn(e,t){let{cursorOffset:u,rangeStart:r,rangeEnd:o}=t;return u=Nu(e,u,-1),r=Nu(e,r,0),o=Nu(e,o,e.length),{...t,cursorOffset:u,rangeStart:r,rangeEnd:o}}function Pn(e,t){let{cursorOffset:u,rangeStart:r,rangeEnd:o,endOfLine:n}=Nn(e,t),a=e.charAt(0)===wn;if(a&&(e=e.slice(1),u--,r--,o--),n==="auto"&&(n=Yu(e)),e.includes("\r")){let s=i=>$t(e.slice(0,Math.max(i,0)),`\r
`);u-=s(u),r-=s(r),o-=s(o),e=ju(e);}return {hasBOM:a,text:e,options:Nn(e,{...t,cursorOffset:u,rangeStart:r,rangeEnd:o,endOfLine:n})}}async function Sn(e,t){let u=await We(t);return !u.hasPragma||u.hasPragma(e)}async function ja(e,t){return (await We(t)).hasIgnorePragma?.(e)}async function Su(e,t){let{hasBOM:u,text:r,options:o}=Pn(e,await se(t));if(o.rangeStart>=o.rangeEnd&&r!==""||o.requirePragma&&!await Sn(r,o)||o.checkIgnorePragma&&await ja(r,o))return {formatted:e,cursorOffset:t.cursorOffset,comments:[]};let n;return o.rangeStart>0||o.rangeEnd<r.length?n=await Ya(r,o):(!o.requirePragma&&o.insertPragma&&o.printer.insertPragma&&!await Sn(r,o)&&(r=o.printer.insertPragma(r)),n=await On(r,o)),u&&(n.formatted=wn+n.formatted,n.cursorOffset>=0&&n.cursorOffset++),n}async function In(e,t,u){let{text:r,options:o}=Pn(e,await se(t)),n=await Fe(r,o);return u&&(u.preprocessForPrint&&(n.ast=await xu(n.ast,o)),u.massage&&(n.ast=yn(n.ast,o))),n}async function kn(e,t){t=await se(t);let u=await Ge(e,t);return Ce(u,t)}async function vn(e,t){let u=sr(e),{formatted:r}=await Su(u,{...t,parser:"__js_expression"});return r}async function Rn(e,t){t=await se(t);let{ast:u}=await Fe(e,t);return t.cursorOffset>=0&&(t={...t,...Bu(u,t)}),Ge(u,t)}async function Ln(e,t){return Ce(e,await se(t))}var wu={};Yt(wu,{builders:()=>Wa,printer:()=>$a,utils:()=>Va});var Wa={join:Ie,line:ut,softline:or,hardline:V,literalline:Qe,group:Kt,conditionalGroup:tr,fill:er,lineSuffix:ve,lineSuffixBoundary:ar,cursor:ee,breakParent:ce,ifBreak:ur,trim:ir,indent:ae,indentIfBreak:rr,align:De,addAlignmentToDoc:tt,markAsRoot:et,dedentToRoot:Qu,dedent:Zu,hardlineWithoutBreakParent:ke,literallineWithoutBreakParent:Gt,label:nr,concat:e=>e},$a={printDocToString:Ce},Va={willBreak:Ku,traverseDoc:we,findInDoc:Xe,mapDoc:Pe,removeLines:zu,stripTrailingHardline:qe,replaceEndOfLine:Ju,canBreak:Hu};var Mn="3.8.1";var Pu={};Yt(Pu,{addDanglingComment:()=>ue,addLeadingComment:()=>fe,addTrailingComment:()=>le,getAlignmentSize:()=>he,getIndentSize:()=>Yn,getMaxContinuousCount:()=>jn,getNextNonSpaceNonCommentCharacter:()=>Un,getNextNonSpaceNonCommentCharacterIndex:()=>ni,getPreferredQuote:()=>Vn,getStringWidth:()=>Re,hasNewline:()=>z,hasNewlineInRange:()=>Kn,hasSpaces:()=>Gn,isNextLineEmpty:()=>Di,isNextLineEmptyAfterIndex:()=>kt,isPreviousLineEmpty:()=>ai,makeString:()=>si,skip:()=>ye,skipEverythingButNewLine:()=>ot,skipInlineComment:()=>xe,skipNewline:()=>K,skipSpaces:()=>Y,skipToLineEnd:()=>nt,skipTrailingComment:()=>Be,skipWhitespace:()=>Fr});function Ka(e,t){if(t===false)return  false;if(e.charAt(t)==="/"&&e.charAt(t+1)==="*"){for(let u=t+2;u<e.length;++u)if(e.charAt(u)==="*"&&e.charAt(u+1)==="/")return u+2}return t}var xe=Ka;function Ga(e,t){return t===false?false:e.charAt(t)==="/"&&e.charAt(t+1)==="/"?ot(e,t):t}var Be=Ga;function za(e,t){let u=null,r=t;for(;r!==u;)u=r,r=Y(e,r),r=xe(e,r),r=Be(e,r),r=K(e,r);return r}var ze=za;function Ja(e,t){let u=null,r=t;for(;r!==u;)u=r,r=nt(e,r),r=xe(e,r),r=Y(e,r);return r=Be(e,r),r=K(e,r),r!==false&&z(e,r)}var kt=Ja;function Ha(e,t){let u=e.lastIndexOf(`
`);return u===-1?0:he(e.slice(u+1).match(/^[\t ]*/u)[0],t)}var Yn=Ha;function Ou(e){if(typeof e!="string")throw new TypeError("Expected a string");return e.replace(/[|\\{}()[\]^$+*?.]/g,"\\$&").replace(/-/g,"\\x2d")}function Xa(e,t){let u=e.matchAll(new RegExp(`(?:${Ou(t)})+`,"gu"));return u.reduce||(u=[...u]),u.reduce((r,[o])=>Math.max(r,o.length),0)/t.length}var jn=Xa;function qa(e,t){let u=ze(e,t);return u===false?"":e.charAt(u)}var Un=qa;var Wn=Object.freeze({character:"'",codePoint:39}),$n=Object.freeze({character:'"',codePoint:34}),Qa=Object.freeze({preferred:Wn,alternate:$n}),Za=Object.freeze({preferred:$n,alternate:Wn});function ei(e,t){let{preferred:u,alternate:r}=t===true||t==="'"?Qa:Za,{length:o}=e,n=0,a=0;for(let s=0;s<o;s++){let i=e.charCodeAt(s);i===u.codePoint?n++:i===r.codePoint&&a++;}return (n>a?r:u).character}var Vn=ei;function ti(e,t,u){for(let r=t;r<u;++r)if(e.charAt(r)===`
`)return  true;return  false}var Kn=ti;function ui(e,t,u={}){return Y(e,u.backwards?t-1:t,u)!==t}var Gn=ui;function ri(e,t,u){return ze(e,u(t))}function ni(e,t){return arguments.length===2||typeof t=="number"?ze(e,t):ri(...arguments)}function oi(e,t,u){return Le(e,u(t))}function ai(e,t){return arguments.length===2||typeof t=="number"?Le(e,t):oi(...arguments)}function ii(e,t,u){return kt(e,u(t))}function si(e,t,u){let r=t==='"'?"'":'"',n=oe(0,e,/\\(.)|(["'])/gsu,(a,s,i)=>s===r?s:i===t?"\\"+i:i||(u&&/^[^\n\r"'0-7\\bfnrt-vx\u2028\u2029]$/u.test(s)?s:"\\"+s));return t+n+t}function Di(e,t){return arguments.length===2||typeof t=="number"?kt(e,t):ii(...arguments)}function me(e,t=1){return async(...u)=>{let r=u[t]??{},o=r.plugins??[];return u[t]={...r,plugins:Array.isArray(o)?o:Object.values(o)},e(...u)}}var zn=me(Su);async function Jn(e,t){let{formatted:u}=await zn(e,{...t,cursorOffset:-1});return u}async function ci(e,t){return await Jn(e,t)===e}var fi=me(it,0),li={parse:me(In),formatAST:me(kn),formatDoc:me(vn),printToDoc:me(Rn),printDocToString:me(Ln)};

var react = { exports: {} };
var react_production = {};
var hasRequiredReact_production;
function requireReact_production() {
  if (hasRequiredReact_production) return react_production;
  hasRequiredReact_production = 1;
  var REACT_ELEMENT_TYPE = Symbol.for("react.transitional.element"), REACT_PORTAL_TYPE = Symbol.for("react.portal"), REACT_FRAGMENT_TYPE = Symbol.for("react.fragment"), REACT_STRICT_MODE_TYPE = Symbol.for("react.strict_mode"), REACT_PROFILER_TYPE = Symbol.for("react.profiler"), REACT_CONSUMER_TYPE = Symbol.for("react.consumer"), REACT_CONTEXT_TYPE = Symbol.for("react.context"), REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref"), REACT_SUSPENSE_TYPE = Symbol.for("react.suspense"), REACT_MEMO_TYPE = Symbol.for("react.memo"), REACT_LAZY_TYPE = Symbol.for("react.lazy"), REACT_ACTIVITY_TYPE = Symbol.for("react.activity"), MAYBE_ITERATOR_SYMBOL = Symbol.iterator;
  function getIteratorFn(maybeIterable) {
    if (null === maybeIterable || "object" !== typeof maybeIterable) return null;
    maybeIterable = MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL] || maybeIterable["@@iterator"];
    return "function" === typeof maybeIterable ? maybeIterable : null;
  }
  var ReactNoopUpdateQueue = {
    isMounted: function() {
      return false;
    },
    enqueueForceUpdate: function() {
    },
    enqueueReplaceState: function() {
    },
    enqueueSetState: function() {
    }
  }, assign = Object.assign, emptyObject = {};
  function Component(props, context, updater) {
    this.props = props;
    this.context = context;
    this.refs = emptyObject;
    this.updater = updater || ReactNoopUpdateQueue;
  }
  Component.prototype.isReactComponent = {};
  Component.prototype.setState = function(partialState, callback) {
    if ("object" !== typeof partialState && "function" !== typeof partialState && null != partialState)
      throw Error(
        "takes an object of state variables to update or a function which returns an object of state variables."
      );
    this.updater.enqueueSetState(this, partialState, callback, "setState");
  };
  Component.prototype.forceUpdate = function(callback) {
    this.updater.enqueueForceUpdate(this, callback, "forceUpdate");
  };
  function ComponentDummy() {
  }
  ComponentDummy.prototype = Component.prototype;
  function PureComponent(props, context, updater) {
    this.props = props;
    this.context = context;
    this.refs = emptyObject;
    this.updater = updater || ReactNoopUpdateQueue;
  }
  var pureComponentPrototype = PureComponent.prototype = new ComponentDummy();
  pureComponentPrototype.constructor = PureComponent;
  assign(pureComponentPrototype, Component.prototype);
  pureComponentPrototype.isPureReactComponent = true;
  var isArrayImpl = Array.isArray;
  function noop() {
  }
  var ReactSharedInternals = { H: null, A: null, T: null, S: null }, hasOwnProperty = Object.prototype.hasOwnProperty;
  function ReactElement(type, key, props) {
    var refProp = props.ref;
    return {
      $$typeof: REACT_ELEMENT_TYPE,
      type,
      key,
      ref: void 0 !== refProp ? refProp : null,
      props
    };
  }
  function cloneAndReplaceKey(oldElement, newKey) {
    return ReactElement(oldElement.type, newKey, oldElement.props);
  }
  function isValidElement(object) {
    return "object" === typeof object && null !== object && object.$$typeof === REACT_ELEMENT_TYPE;
  }
  function escape(key) {
    var escaperLookup = { "=": "=0", ":": "=2" };
    return "$" + key.replace(/[=:]/g, function(match) {
      return escaperLookup[match];
    });
  }
  var userProvidedKeyEscapeRegex = /\/+/g;
  function getElementKey(element, index2) {
    return "object" === typeof element && null !== element && null != element.key ? escape("" + element.key) : index2.toString(36);
  }
  function resolveThenable(thenable) {
    switch (thenable.status) {
      case "fulfilled":
        return thenable.value;
      case "rejected":
        throw thenable.reason;
      default:
        switch ("string" === typeof thenable.status ? thenable.then(noop, noop) : (thenable.status = "pending", thenable.then(
          function(fulfilledValue) {
            "pending" === thenable.status && (thenable.status = "fulfilled", thenable.value = fulfilledValue);
          },
          function(error) {
            "pending" === thenable.status && (thenable.status = "rejected", thenable.reason = error);
          }
        )), thenable.status) {
          case "fulfilled":
            return thenable.value;
          case "rejected":
            throw thenable.reason;
        }
    }
    throw thenable;
  }
  function mapIntoArray(children, array, escapedPrefix, nameSoFar, callback) {
    var type = typeof children;
    if ("undefined" === type || "boolean" === type) children = null;
    var invokeCallback = false;
    if (null === children) invokeCallback = true;
    else
      switch (type) {
        case "bigint":
        case "string":
        case "number":
          invokeCallback = true;
          break;
        case "object":
          switch (children.$$typeof) {
            case REACT_ELEMENT_TYPE:
            case REACT_PORTAL_TYPE:
              invokeCallback = true;
              break;
            case REACT_LAZY_TYPE:
              return invokeCallback = children._init, mapIntoArray(
                invokeCallback(children._payload),
                array,
                escapedPrefix,
                nameSoFar,
                callback
              );
          }
      }
    if (invokeCallback)
      return callback = callback(children), invokeCallback = "" === nameSoFar ? "." + getElementKey(children, 0) : nameSoFar, isArrayImpl(callback) ? (escapedPrefix = "", null != invokeCallback && (escapedPrefix = invokeCallback.replace(userProvidedKeyEscapeRegex, "$&/") + "/"), mapIntoArray(callback, array, escapedPrefix, "", function(c) {
        return c;
      })) : null != callback && (isValidElement(callback) && (callback = cloneAndReplaceKey(
        callback,
        escapedPrefix + (null == callback.key || children && children.key === callback.key ? "" : ("" + callback.key).replace(
          userProvidedKeyEscapeRegex,
          "$&/"
        ) + "/") + invokeCallback
      )), array.push(callback)), 1;
    invokeCallback = 0;
    var nextNamePrefix = "" === nameSoFar ? "." : nameSoFar + ":";
    if (isArrayImpl(children))
      for (var i = 0; i < children.length; i++)
        nameSoFar = children[i], type = nextNamePrefix + getElementKey(nameSoFar, i), invokeCallback += mapIntoArray(
          nameSoFar,
          array,
          escapedPrefix,
          type,
          callback
        );
    else if (i = getIteratorFn(children), "function" === typeof i)
      for (children = i.call(children), i = 0; !(nameSoFar = children.next()).done; )
        nameSoFar = nameSoFar.value, type = nextNamePrefix + getElementKey(nameSoFar, i++), invokeCallback += mapIntoArray(
          nameSoFar,
          array,
          escapedPrefix,
          type,
          callback
        );
    else if ("object" === type) {
      if ("function" === typeof children.then)
        return mapIntoArray(
          resolveThenable(children),
          array,
          escapedPrefix,
          nameSoFar,
          callback
        );
      array = String(children);
      throw Error(
        "Objects are not valid as a React child (found: " + ("[object Object]" === array ? "object with keys {" + Object.keys(children).join(", ") + "}" : array) + "). If you meant to render a collection of children, use an array instead."
      );
    }
    return invokeCallback;
  }
  function mapChildren(children, func, context) {
    if (null == children) return children;
    var result = [], count = 0;
    mapIntoArray(children, result, "", "", function(child) {
      return func.call(context, child, count++);
    });
    return result;
  }
  function lazyInitializer(payload) {
    if (-1 === payload._status) {
      var ctor = payload._result;
      ctor = ctor();
      ctor.then(
        function(moduleObject) {
          if (0 === payload._status || -1 === payload._status)
            payload._status = 1, payload._result = moduleObject;
        },
        function(error) {
          if (0 === payload._status || -1 === payload._status)
            payload._status = 2, payload._result = error;
        }
      );
      -1 === payload._status && (payload._status = 0, payload._result = ctor);
    }
    if (1 === payload._status) return payload._result.default;
    throw payload._result;
  }
  var reportGlobalError = "function" === typeof reportError ? reportError : function(error) {
    if ("object" === typeof window && "function" === typeof window.ErrorEvent) {
      var event = new window.ErrorEvent("error", {
        bubbles: true,
        cancelable: true,
        message: "object" === typeof error && null !== error && "string" === typeof error.message ? String(error.message) : String(error),
        error
      });
      if (!window.dispatchEvent(event)) return;
    } else if ("object" === typeof process && "function" === typeof process.emit) {
      process.emit("uncaughtException", error);
      return;
    }
    console.error(error);
  }, Children = {
    map: mapChildren,
    forEach: function(children, forEachFunc, forEachContext) {
      mapChildren(
        children,
        function() {
          forEachFunc.apply(this, arguments);
        },
        forEachContext
      );
    },
    count: function(children) {
      var n = 0;
      mapChildren(children, function() {
        n++;
      });
      return n;
    },
    toArray: function(children) {
      return mapChildren(children, function(child) {
        return child;
      }) || [];
    },
    only: function(children) {
      if (!isValidElement(children))
        throw Error(
          "React.Children.only expected to receive a single React element child."
        );
      return children;
    }
  };
  react_production.Activity = REACT_ACTIVITY_TYPE;
  react_production.Children = Children;
  react_production.Component = Component;
  react_production.Fragment = REACT_FRAGMENT_TYPE;
  react_production.Profiler = REACT_PROFILER_TYPE;
  react_production.PureComponent = PureComponent;
  react_production.StrictMode = REACT_STRICT_MODE_TYPE;
  react_production.Suspense = REACT_SUSPENSE_TYPE;
  react_production.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = ReactSharedInternals;
  react_production.__COMPILER_RUNTIME = {
    __proto__: null,
    c: function(size) {
      return ReactSharedInternals.H.useMemoCache(size);
    }
  };
  react_production.cache = function(fn) {
    return function() {
      return fn.apply(null, arguments);
    };
  };
  react_production.cacheSignal = function() {
    return null;
  };
  react_production.cloneElement = function(element, config, children) {
    if (null === element || void 0 === element)
      throw Error(
        "The argument must be a React element, but you passed " + element + "."
      );
    var props = assign({}, element.props), key = element.key;
    if (null != config)
      for (propName in void 0 !== config.key && (key = "" + config.key), config)
        !hasOwnProperty.call(config, propName) || "key" === propName || "__self" === propName || "__source" === propName || "ref" === propName && void 0 === config.ref || (props[propName] = config[propName]);
    var propName = arguments.length - 2;
    if (1 === propName) props.children = children;
    else if (1 < propName) {
      for (var childArray = Array(propName), i = 0; i < propName; i++)
        childArray[i] = arguments[i + 2];
      props.children = childArray;
    }
    return ReactElement(element.type, key, props);
  };
  react_production.createContext = function(defaultValue) {
    defaultValue = {
      $$typeof: REACT_CONTEXT_TYPE,
      _currentValue: defaultValue,
      _currentValue2: defaultValue,
      _threadCount: 0,
      Provider: null,
      Consumer: null
    };
    defaultValue.Provider = defaultValue;
    defaultValue.Consumer = {
      $$typeof: REACT_CONSUMER_TYPE,
      _context: defaultValue
    };
    return defaultValue;
  };
  react_production.createElement = function(type, config, children) {
    var propName, props = {}, key = null;
    if (null != config)
      for (propName in void 0 !== config.key && (key = "" + config.key), config)
        hasOwnProperty.call(config, propName) && "key" !== propName && "__self" !== propName && "__source" !== propName && (props[propName] = config[propName]);
    var childrenLength = arguments.length - 2;
    if (1 === childrenLength) props.children = children;
    else if (1 < childrenLength) {
      for (var childArray = Array(childrenLength), i = 0; i < childrenLength; i++)
        childArray[i] = arguments[i + 2];
      props.children = childArray;
    }
    if (type && type.defaultProps)
      for (propName in childrenLength = type.defaultProps, childrenLength)
        void 0 === props[propName] && (props[propName] = childrenLength[propName]);
    return ReactElement(type, key, props);
  };
  react_production.createRef = function() {
    return { current: null };
  };
  react_production.forwardRef = function(render2) {
    return { $$typeof: REACT_FORWARD_REF_TYPE, render: render2 };
  };
  react_production.isValidElement = isValidElement;
  react_production.lazy = function(ctor) {
    return {
      $$typeof: REACT_LAZY_TYPE,
      _payload: { _status: -1, _result: ctor },
      _init: lazyInitializer
    };
  };
  react_production.memo = function(type, compare) {
    return {
      $$typeof: REACT_MEMO_TYPE,
      type,
      compare: void 0 === compare ? null : compare
    };
  };
  react_production.startTransition = function(scope) {
    var prevTransition = ReactSharedInternals.T, currentTransition = {};
    ReactSharedInternals.T = currentTransition;
    try {
      var returnValue = scope(), onStartTransitionFinish = ReactSharedInternals.S;
      null !== onStartTransitionFinish && onStartTransitionFinish(currentTransition, returnValue);
      "object" === typeof returnValue && null !== returnValue && "function" === typeof returnValue.then && returnValue.then(noop, reportGlobalError);
    } catch (error) {
      reportGlobalError(error);
    } finally {
      null !== prevTransition && null !== currentTransition.types && (prevTransition.types = currentTransition.types), ReactSharedInternals.T = prevTransition;
    }
  };
  react_production.unstable_useCacheRefresh = function() {
    return ReactSharedInternals.H.useCacheRefresh();
  };
  react_production.use = function(usable) {
    return ReactSharedInternals.H.use(usable);
  };
  react_production.useActionState = function(action, initialState, permalink) {
    return ReactSharedInternals.H.useActionState(action, initialState, permalink);
  };
  react_production.useCallback = function(callback, deps) {
    return ReactSharedInternals.H.useCallback(callback, deps);
  };
  react_production.useContext = function(Context) {
    return ReactSharedInternals.H.useContext(Context);
  };
  react_production.useDebugValue = function() {
  };
  react_production.useDeferredValue = function(value, initialValue) {
    return ReactSharedInternals.H.useDeferredValue(value, initialValue);
  };
  react_production.useEffect = function(create, deps) {
    return ReactSharedInternals.H.useEffect(create, deps);
  };
  react_production.useEffectEvent = function(callback) {
    return ReactSharedInternals.H.useEffectEvent(callback);
  };
  react_production.useId = function() {
    return ReactSharedInternals.H.useId();
  };
  react_production.useImperativeHandle = function(ref, create, deps) {
    return ReactSharedInternals.H.useImperativeHandle(ref, create, deps);
  };
  react_production.useInsertionEffect = function(create, deps) {
    return ReactSharedInternals.H.useInsertionEffect(create, deps);
  };
  react_production.useLayoutEffect = function(create, deps) {
    return ReactSharedInternals.H.useLayoutEffect(create, deps);
  };
  react_production.useMemo = function(create, deps) {
    return ReactSharedInternals.H.useMemo(create, deps);
  };
  react_production.useOptimistic = function(passthrough, reducer) {
    return ReactSharedInternals.H.useOptimistic(passthrough, reducer);
  };
  react_production.useReducer = function(reducer, initialArg, init) {
    return ReactSharedInternals.H.useReducer(reducer, initialArg, init);
  };
  react_production.useRef = function(initialValue) {
    return ReactSharedInternals.H.useRef(initialValue);
  };
  react_production.useState = function(initialState) {
    return ReactSharedInternals.H.useState(initialState);
  };
  react_production.useSyncExternalStore = function(subscribe, getSnapshot, getServerSnapshot) {
    return ReactSharedInternals.H.useSyncExternalStore(
      subscribe,
      getSnapshot,
      getServerSnapshot
    );
  };
  react_production.useTransition = function() {
    return ReactSharedInternals.H.useTransition();
  };
  react_production.version = "19.2.0";
  return react_production;
}
var react_development = { exports: {} };
react_development.exports;
var hasRequiredReact_development;
function requireReact_development() {
  if (hasRequiredReact_development) return react_development.exports;
  hasRequiredReact_development = 1;
  (function(module, exports) {
    "production" !== process.env.NODE_ENV && (function() {
      function defineDeprecationWarning(methodName, info) {
        Object.defineProperty(Component.prototype, methodName, {
          get: function() {
            console.warn(
              "%s(...) is deprecated in plain JavaScript React classes. %s",
              info[0],
              info[1]
            );
          }
        });
      }
      function getIteratorFn(maybeIterable) {
        if (null === maybeIterable || "object" !== typeof maybeIterable)
          return null;
        maybeIterable = MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL] || maybeIterable["@@iterator"];
        return "function" === typeof maybeIterable ? maybeIterable : null;
      }
      function warnNoop(publicInstance, callerName) {
        publicInstance = (publicInstance = publicInstance.constructor) && (publicInstance.displayName || publicInstance.name) || "ReactClass";
        var warningKey = publicInstance + "." + callerName;
        didWarnStateUpdateForUnmountedComponent[warningKey] || (console.error(
          "Can't call %s on a component that is not yet mounted. This is a no-op, but it might indicate a bug in your application. Instead, assign to `this.state` directly or define a `state = {};` class property with the desired state in the %s component.",
          callerName,
          publicInstance
        ), didWarnStateUpdateForUnmountedComponent[warningKey] = true);
      }
      function Component(props, context, updater) {
        this.props = props;
        this.context = context;
        this.refs = emptyObject;
        this.updater = updater || ReactNoopUpdateQueue;
      }
      function ComponentDummy() {
      }
      function PureComponent(props, context, updater) {
        this.props = props;
        this.context = context;
        this.refs = emptyObject;
        this.updater = updater || ReactNoopUpdateQueue;
      }
      function noop() {
      }
      function testStringCoercion(value) {
        return "" + value;
      }
      function checkKeyStringCoercion(value) {
        try {
          testStringCoercion(value);
          var JSCompiler_inline_result = false;
        } catch (e) {
          JSCompiler_inline_result = true;
        }
        if (JSCompiler_inline_result) {
          JSCompiler_inline_result = console;
          var JSCompiler_temp_const = JSCompiler_inline_result.error;
          var JSCompiler_inline_result$jscomp$0 = "function" === typeof Symbol && Symbol.toStringTag && value[Symbol.toStringTag] || value.constructor.name || "Object";
          JSCompiler_temp_const.call(
            JSCompiler_inline_result,
            "The provided key is an unsupported type %s. This value must be coerced to a string before using it here.",
            JSCompiler_inline_result$jscomp$0
          );
          return testStringCoercion(value);
        }
      }
      function getComponentNameFromType(type) {
        if (null == type) return null;
        if ("function" === typeof type)
          return type.$$typeof === REACT_CLIENT_REFERENCE ? null : type.displayName || type.name || null;
        if ("string" === typeof type) return type;
        switch (type) {
          case REACT_FRAGMENT_TYPE:
            return "Fragment";
          case REACT_PROFILER_TYPE:
            return "Profiler";
          case REACT_STRICT_MODE_TYPE:
            return "StrictMode";
          case REACT_SUSPENSE_TYPE:
            return "Suspense";
          case REACT_SUSPENSE_LIST_TYPE:
            return "SuspenseList";
          case REACT_ACTIVITY_TYPE:
            return "Activity";
        }
        if ("object" === typeof type)
          switch ("number" === typeof type.tag && console.error(
            "Received an unexpected object in getComponentNameFromType(). This is likely a bug in React. Please file an issue."
          ), type.$$typeof) {
            case REACT_PORTAL_TYPE:
              return "Portal";
            case REACT_CONTEXT_TYPE:
              return type.displayName || "Context";
            case REACT_CONSUMER_TYPE:
              return (type._context.displayName || "Context") + ".Consumer";
            case REACT_FORWARD_REF_TYPE:
              var innerType = type.render;
              type = type.displayName;
              type || (type = innerType.displayName || innerType.name || "", type = "" !== type ? "ForwardRef(" + type + ")" : "ForwardRef");
              return type;
            case REACT_MEMO_TYPE:
              return innerType = type.displayName || null, null !== innerType ? innerType : getComponentNameFromType(type.type) || "Memo";
            case REACT_LAZY_TYPE:
              innerType = type._payload;
              type = type._init;
              try {
                return getComponentNameFromType(type(innerType));
              } catch (x) {
              }
          }
        return null;
      }
      function getTaskName(type) {
        if (type === REACT_FRAGMENT_TYPE) return "<>";
        if ("object" === typeof type && null !== type && type.$$typeof === REACT_LAZY_TYPE)
          return "<...>";
        try {
          var name = getComponentNameFromType(type);
          return name ? "<" + name + ">" : "<...>";
        } catch (x) {
          return "<...>";
        }
      }
      function getOwner() {
        var dispatcher = ReactSharedInternals.A;
        return null === dispatcher ? null : dispatcher.getOwner();
      }
      function UnknownOwner() {
        return Error("react-stack-top-frame");
      }
      function hasValidKey(config) {
        if (hasOwnProperty.call(config, "key")) {
          var getter = Object.getOwnPropertyDescriptor(config, "key").get;
          if (getter && getter.isReactWarning) return false;
        }
        return void 0 !== config.key;
      }
      function defineKeyPropWarningGetter(props, displayName) {
        function warnAboutAccessingKey() {
          specialPropKeyWarningShown || (specialPropKeyWarningShown = true, console.error(
            "%s: `key` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://react.dev/link/special-props)",
            displayName
          ));
        }
        warnAboutAccessingKey.isReactWarning = true;
        Object.defineProperty(props, "key", {
          get: warnAboutAccessingKey,
          configurable: true
        });
      }
      function elementRefGetterWithDeprecationWarning() {
        var componentName = getComponentNameFromType(this.type);
        didWarnAboutElementRef[componentName] || (didWarnAboutElementRef[componentName] = true, console.error(
          "Accessing element.ref was removed in React 19. ref is now a regular prop. It will be removed from the JSX Element type in a future release."
        ));
        componentName = this.props.ref;
        return void 0 !== componentName ? componentName : null;
      }
      function ReactElement(type, key, props, owner, debugStack, debugTask) {
        var refProp = props.ref;
        type = {
          $$typeof: REACT_ELEMENT_TYPE,
          type,
          key,
          props,
          _owner: owner
        };
        null !== (void 0 !== refProp ? refProp : null) ? Object.defineProperty(type, "ref", {
          enumerable: false,
          get: elementRefGetterWithDeprecationWarning
        }) : Object.defineProperty(type, "ref", { enumerable: false, value: null });
        type._store = {};
        Object.defineProperty(type._store, "validated", {
          configurable: false,
          enumerable: false,
          writable: true,
          value: 0
        });
        Object.defineProperty(type, "_debugInfo", {
          configurable: false,
          enumerable: false,
          writable: true,
          value: null
        });
        Object.defineProperty(type, "_debugStack", {
          configurable: false,
          enumerable: false,
          writable: true,
          value: debugStack
        });
        Object.defineProperty(type, "_debugTask", {
          configurable: false,
          enumerable: false,
          writable: true,
          value: debugTask
        });
        Object.freeze && (Object.freeze(type.props), Object.freeze(type));
        return type;
      }
      function cloneAndReplaceKey(oldElement, newKey) {
        newKey = ReactElement(
          oldElement.type,
          newKey,
          oldElement.props,
          oldElement._owner,
          oldElement._debugStack,
          oldElement._debugTask
        );
        oldElement._store && (newKey._store.validated = oldElement._store.validated);
        return newKey;
      }
      function validateChildKeys(node) {
        isValidElement(node) ? node._store && (node._store.validated = 1) : "object" === typeof node && null !== node && node.$$typeof === REACT_LAZY_TYPE && ("fulfilled" === node._payload.status ? isValidElement(node._payload.value) && node._payload.value._store && (node._payload.value._store.validated = 1) : node._store && (node._store.validated = 1));
      }
      function isValidElement(object) {
        return "object" === typeof object && null !== object && object.$$typeof === REACT_ELEMENT_TYPE;
      }
      function escape(key) {
        var escaperLookup = { "=": "=0", ":": "=2" };
        return "$" + key.replace(/[=:]/g, function(match) {
          return escaperLookup[match];
        });
      }
      function getElementKey(element, index2) {
        return "object" === typeof element && null !== element && null != element.key ? (checkKeyStringCoercion(element.key), escape("" + element.key)) : index2.toString(36);
      }
      function resolveThenable(thenable) {
        switch (thenable.status) {
          case "fulfilled":
            return thenable.value;
          case "rejected":
            throw thenable.reason;
          default:
            switch ("string" === typeof thenable.status ? thenable.then(noop, noop) : (thenable.status = "pending", thenable.then(
              function(fulfilledValue) {
                "pending" === thenable.status && (thenable.status = "fulfilled", thenable.value = fulfilledValue);
              },
              function(error) {
                "pending" === thenable.status && (thenable.status = "rejected", thenable.reason = error);
              }
            )), thenable.status) {
              case "fulfilled":
                return thenable.value;
              case "rejected":
                throw thenable.reason;
            }
        }
        throw thenable;
      }
      function mapIntoArray(children, array, escapedPrefix, nameSoFar, callback) {
        var type = typeof children;
        if ("undefined" === type || "boolean" === type) children = null;
        var invokeCallback = false;
        if (null === children) invokeCallback = true;
        else
          switch (type) {
            case "bigint":
            case "string":
            case "number":
              invokeCallback = true;
              break;
            case "object":
              switch (children.$$typeof) {
                case REACT_ELEMENT_TYPE:
                case REACT_PORTAL_TYPE:
                  invokeCallback = true;
                  break;
                case REACT_LAZY_TYPE:
                  return invokeCallback = children._init, mapIntoArray(
                    invokeCallback(children._payload),
                    array,
                    escapedPrefix,
                    nameSoFar,
                    callback
                  );
              }
          }
        if (invokeCallback) {
          invokeCallback = children;
          callback = callback(invokeCallback);
          var childKey = "" === nameSoFar ? "." + getElementKey(invokeCallback, 0) : nameSoFar;
          isArrayImpl(callback) ? (escapedPrefix = "", null != childKey && (escapedPrefix = childKey.replace(userProvidedKeyEscapeRegex, "$&/") + "/"), mapIntoArray(callback, array, escapedPrefix, "", function(c) {
            return c;
          })) : null != callback && (isValidElement(callback) && (null != callback.key && (invokeCallback && invokeCallback.key === callback.key || checkKeyStringCoercion(callback.key)), escapedPrefix = cloneAndReplaceKey(
            callback,
            escapedPrefix + (null == callback.key || invokeCallback && invokeCallback.key === callback.key ? "" : ("" + callback.key).replace(
              userProvidedKeyEscapeRegex,
              "$&/"
            ) + "/") + childKey
          ), "" !== nameSoFar && null != invokeCallback && isValidElement(invokeCallback) && null == invokeCallback.key && invokeCallback._store && !invokeCallback._store.validated && (escapedPrefix._store.validated = 2), callback = escapedPrefix), array.push(callback));
          return 1;
        }
        invokeCallback = 0;
        childKey = "" === nameSoFar ? "." : nameSoFar + ":";
        if (isArrayImpl(children))
          for (var i = 0; i < children.length; i++)
            nameSoFar = children[i], type = childKey + getElementKey(nameSoFar, i), invokeCallback += mapIntoArray(
              nameSoFar,
              array,
              escapedPrefix,
              type,
              callback
            );
        else if (i = getIteratorFn(children), "function" === typeof i)
          for (i === children.entries && (didWarnAboutMaps || console.warn(
            "Using Maps as children is not supported. Use an array of keyed ReactElements instead."
          ), didWarnAboutMaps = true), children = i.call(children), i = 0; !(nameSoFar = children.next()).done; )
            nameSoFar = nameSoFar.value, type = childKey + getElementKey(nameSoFar, i++), invokeCallback += mapIntoArray(
              nameSoFar,
              array,
              escapedPrefix,
              type,
              callback
            );
        else if ("object" === type) {
          if ("function" === typeof children.then)
            return mapIntoArray(
              resolveThenable(children),
              array,
              escapedPrefix,
              nameSoFar,
              callback
            );
          array = String(children);
          throw Error(
            "Objects are not valid as a React child (found: " + ("[object Object]" === array ? "object with keys {" + Object.keys(children).join(", ") + "}" : array) + "). If you meant to render a collection of children, use an array instead."
          );
        }
        return invokeCallback;
      }
      function mapChildren(children, func, context) {
        if (null == children) return children;
        var result = [], count = 0;
        mapIntoArray(children, result, "", "", function(child) {
          return func.call(context, child, count++);
        });
        return result;
      }
      function lazyInitializer(payload) {
        if (-1 === payload._status) {
          var ioInfo = payload._ioInfo;
          null != ioInfo && (ioInfo.start = ioInfo.end = performance.now());
          ioInfo = payload._result;
          var thenable = ioInfo();
          thenable.then(
            function(moduleObject) {
              if (0 === payload._status || -1 === payload._status) {
                payload._status = 1;
                payload._result = moduleObject;
                var _ioInfo = payload._ioInfo;
                null != _ioInfo && (_ioInfo.end = performance.now());
                void 0 === thenable.status && (thenable.status = "fulfilled", thenable.value = moduleObject);
              }
            },
            function(error) {
              if (0 === payload._status || -1 === payload._status) {
                payload._status = 2;
                payload._result = error;
                var _ioInfo2 = payload._ioInfo;
                null != _ioInfo2 && (_ioInfo2.end = performance.now());
                void 0 === thenable.status && (thenable.status = "rejected", thenable.reason = error);
              }
            }
          );
          ioInfo = payload._ioInfo;
          if (null != ioInfo) {
            ioInfo.value = thenable;
            var displayName = thenable.displayName;
            "string" === typeof displayName && (ioInfo.name = displayName);
          }
          -1 === payload._status && (payload._status = 0, payload._result = thenable);
        }
        if (1 === payload._status)
          return ioInfo = payload._result, void 0 === ioInfo && console.error(
            "lazy: Expected the result of a dynamic import() call. Instead received: %s\n\nYour code should look like: \n  const MyComponent = lazy(() => import('./MyComponent'))\n\nDid you accidentally put curly braces around the import?",
            ioInfo
          ), "default" in ioInfo || console.error(
            "lazy: Expected the result of a dynamic import() call. Instead received: %s\n\nYour code should look like: \n  const MyComponent = lazy(() => import('./MyComponent'))",
            ioInfo
          ), ioInfo.default;
        throw payload._result;
      }
      function resolveDispatcher() {
        var dispatcher = ReactSharedInternals.H;
        null === dispatcher && console.error(
          "Invalid hook call. Hooks can only be called inside of the body of a function component. This could happen for one of the following reasons:\n1. You might have mismatching versions of React and the renderer (such as React DOM)\n2. You might be breaking the Rules of Hooks\n3. You might have more than one copy of React in the same app\nSee https://react.dev/link/invalid-hook-call for tips about how to debug and fix this problem."
        );
        return dispatcher;
      }
      function releaseAsyncTransition() {
        ReactSharedInternals.asyncTransitions--;
      }
      function enqueueTask(task) {
        if (null === enqueueTaskImpl)
          try {
            var requireString = ("require" + Math.random()).slice(0, 7);
            enqueueTaskImpl = (module && module[requireString]).call(
              module,
              "timers"
            ).setImmediate;
          } catch (_err) {
            enqueueTaskImpl = function(callback) {
              false === didWarnAboutMessageChannel && (didWarnAboutMessageChannel = true, "undefined" === typeof MessageChannel && console.error(
                "This browser does not have a MessageChannel implementation, so enqueuing tasks via await act(async () => ...) will fail. Please file an issue at https://github.com/facebook/react/issues if you encounter this warning."
              ));
              var channel = new MessageChannel();
              channel.port1.onmessage = callback;
              channel.port2.postMessage(void 0);
            };
          }
        return enqueueTaskImpl(task);
      }
      function aggregateErrors(errors) {
        return 1 < errors.length && "function" === typeof AggregateError ? new AggregateError(errors) : errors[0];
      }
      function popActScope(prevActQueue, prevActScopeDepth) {
        prevActScopeDepth !== actScopeDepth - 1 && console.error(
          "You seem to have overlapping act() calls, this is not supported. Be sure to await previous act() calls before making a new one. "
        );
        actScopeDepth = prevActScopeDepth;
      }
      function recursivelyFlushAsyncActWork(returnValue, resolve, reject) {
        var queue = ReactSharedInternals.actQueue;
        if (null !== queue)
          if (0 !== queue.length)
            try {
              flushActQueue(queue);
              enqueueTask(function() {
                return recursivelyFlushAsyncActWork(returnValue, resolve, reject);
              });
              return;
            } catch (error) {
              ReactSharedInternals.thrownErrors.push(error);
            }
          else ReactSharedInternals.actQueue = null;
        0 < ReactSharedInternals.thrownErrors.length ? (queue = aggregateErrors(ReactSharedInternals.thrownErrors), ReactSharedInternals.thrownErrors.length = 0, reject(queue)) : resolve(returnValue);
      }
      function flushActQueue(queue) {
        if (!isFlushing) {
          isFlushing = true;
          var i = 0;
          try {
            for (; i < queue.length; i++) {
              var callback = queue[i];
              do {
                ReactSharedInternals.didUsePromise = false;
                var continuation = callback(false);
                if (null !== continuation) {
                  if (ReactSharedInternals.didUsePromise) {
                    queue[i] = callback;
                    queue.splice(0, i);
                    return;
                  }
                  callback = continuation;
                } else break;
              } while (1);
            }
            queue.length = 0;
          } catch (error) {
            queue.splice(0, i + 1), ReactSharedInternals.thrownErrors.push(error);
          } finally {
            isFlushing = false;
          }
        }
      }
      "undefined" !== typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ && "function" === typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart && __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart(Error());
      var REACT_ELEMENT_TYPE = Symbol.for("react.transitional.element"), REACT_PORTAL_TYPE = Symbol.for("react.portal"), REACT_FRAGMENT_TYPE = Symbol.for("react.fragment"), REACT_STRICT_MODE_TYPE = Symbol.for("react.strict_mode"), REACT_PROFILER_TYPE = Symbol.for("react.profiler"), REACT_CONSUMER_TYPE = Symbol.for("react.consumer"), REACT_CONTEXT_TYPE = Symbol.for("react.context"), REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref"), REACT_SUSPENSE_TYPE = Symbol.for("react.suspense"), REACT_SUSPENSE_LIST_TYPE = Symbol.for("react.suspense_list"), REACT_MEMO_TYPE = Symbol.for("react.memo"), REACT_LAZY_TYPE = Symbol.for("react.lazy"), REACT_ACTIVITY_TYPE = Symbol.for("react.activity"), MAYBE_ITERATOR_SYMBOL = Symbol.iterator, didWarnStateUpdateForUnmountedComponent = {}, ReactNoopUpdateQueue = {
        isMounted: function() {
          return false;
        },
        enqueueForceUpdate: function(publicInstance) {
          warnNoop(publicInstance, "forceUpdate");
        },
        enqueueReplaceState: function(publicInstance) {
          warnNoop(publicInstance, "replaceState");
        },
        enqueueSetState: function(publicInstance) {
          warnNoop(publicInstance, "setState");
        }
      }, assign = Object.assign, emptyObject = {};
      Object.freeze(emptyObject);
      Component.prototype.isReactComponent = {};
      Component.prototype.setState = function(partialState, callback) {
        if ("object" !== typeof partialState && "function" !== typeof partialState && null != partialState)
          throw Error(
            "takes an object of state variables to update or a function which returns an object of state variables."
          );
        this.updater.enqueueSetState(this, partialState, callback, "setState");
      };
      Component.prototype.forceUpdate = function(callback) {
        this.updater.enqueueForceUpdate(this, callback, "forceUpdate");
      };
      var deprecatedAPIs = {
        isMounted: [
          "isMounted",
          "Instead, make sure to clean up subscriptions and pending requests in componentWillUnmount to prevent memory leaks."
        ],
        replaceState: [
          "replaceState",
          "Refactor your code to use setState instead (see https://github.com/facebook/react/issues/3236)."
        ]
      };
      for (fnName in deprecatedAPIs)
        deprecatedAPIs.hasOwnProperty(fnName) && defineDeprecationWarning(fnName, deprecatedAPIs[fnName]);
      ComponentDummy.prototype = Component.prototype;
      deprecatedAPIs = PureComponent.prototype = new ComponentDummy();
      deprecatedAPIs.constructor = PureComponent;
      assign(deprecatedAPIs, Component.prototype);
      deprecatedAPIs.isPureReactComponent = true;
      var isArrayImpl = Array.isArray, REACT_CLIENT_REFERENCE = Symbol.for("react.client.reference"), ReactSharedInternals = {
        H: null,
        A: null,
        T: null,
        S: null,
        actQueue: null,
        asyncTransitions: 0,
        isBatchingLegacy: false,
        didScheduleLegacyUpdate: false,
        didUsePromise: false,
        thrownErrors: [],
        getCurrentStack: null,
        recentlyCreatedOwnerStacks: 0
      }, hasOwnProperty = Object.prototype.hasOwnProperty, createTask = console.createTask ? console.createTask : function() {
        return null;
      };
      deprecatedAPIs = {
        react_stack_bottom_frame: function(callStackForError) {
          return callStackForError();
        }
      };
      var specialPropKeyWarningShown, didWarnAboutOldJSXRuntime;
      var didWarnAboutElementRef = {};
      var unknownOwnerDebugStack = deprecatedAPIs.react_stack_bottom_frame.bind(
        deprecatedAPIs,
        UnknownOwner
      )();
      var unknownOwnerDebugTask = createTask(getTaskName(UnknownOwner));
      var didWarnAboutMaps = false, userProvidedKeyEscapeRegex = /\/+/g, reportGlobalError = "function" === typeof reportError ? reportError : function(error) {
        if ("object" === typeof window && "function" === typeof window.ErrorEvent) {
          var event = new window.ErrorEvent("error", {
            bubbles: true,
            cancelable: true,
            message: "object" === typeof error && null !== error && "string" === typeof error.message ? String(error.message) : String(error),
            error
          });
          if (!window.dispatchEvent(event)) return;
        } else if ("object" === typeof process && "function" === typeof process.emit) {
          process.emit("uncaughtException", error);
          return;
        }
        console.error(error);
      }, didWarnAboutMessageChannel = false, enqueueTaskImpl = null, actScopeDepth = 0, didWarnNoAwaitAct = false, isFlushing = false, queueSeveralMicrotasks = "function" === typeof queueMicrotask ? function(callback) {
        queueMicrotask(function() {
          return queueMicrotask(callback);
        });
      } : enqueueTask;
      deprecatedAPIs = Object.freeze({
        __proto__: null,
        c: function(size) {
          return resolveDispatcher().useMemoCache(size);
        }
      });
      var fnName = {
        map: mapChildren,
        forEach: function(children, forEachFunc, forEachContext) {
          mapChildren(
            children,
            function() {
              forEachFunc.apply(this, arguments);
            },
            forEachContext
          );
        },
        count: function(children) {
          var n = 0;
          mapChildren(children, function() {
            n++;
          });
          return n;
        },
        toArray: function(children) {
          return mapChildren(children, function(child) {
            return child;
          }) || [];
        },
        only: function(children) {
          if (!isValidElement(children))
            throw Error(
              "React.Children.only expected to receive a single React element child."
            );
          return children;
        }
      };
      exports.Activity = REACT_ACTIVITY_TYPE;
      exports.Children = fnName;
      exports.Component = Component;
      exports.Fragment = REACT_FRAGMENT_TYPE;
      exports.Profiler = REACT_PROFILER_TYPE;
      exports.PureComponent = PureComponent;
      exports.StrictMode = REACT_STRICT_MODE_TYPE;
      exports.Suspense = REACT_SUSPENSE_TYPE;
      exports.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = ReactSharedInternals;
      exports.__COMPILER_RUNTIME = deprecatedAPIs;
      exports.act = function(callback) {
        var prevActQueue = ReactSharedInternals.actQueue, prevActScopeDepth = actScopeDepth;
        actScopeDepth++;
        var queue = ReactSharedInternals.actQueue = null !== prevActQueue ? prevActQueue : [], didAwaitActCall = false;
        try {
          var result = callback();
        } catch (error) {
          ReactSharedInternals.thrownErrors.push(error);
        }
        if (0 < ReactSharedInternals.thrownErrors.length)
          throw popActScope(prevActQueue, prevActScopeDepth), callback = aggregateErrors(ReactSharedInternals.thrownErrors), ReactSharedInternals.thrownErrors.length = 0, callback;
        if (null !== result && "object" === typeof result && "function" === typeof result.then) {
          var thenable = result;
          queueSeveralMicrotasks(function() {
            didAwaitActCall || didWarnNoAwaitAct || (didWarnNoAwaitAct = true, console.error(
              "You called act(async () => ...) without await. This could lead to unexpected testing behaviour, interleaving multiple act calls and mixing their scopes. You should - await act(async () => ...);"
            ));
          });
          return {
            then: function(resolve, reject) {
              didAwaitActCall = true;
              thenable.then(
                function(returnValue) {
                  popActScope(prevActQueue, prevActScopeDepth);
                  if (0 === prevActScopeDepth) {
                    try {
                      flushActQueue(queue), enqueueTask(function() {
                        return recursivelyFlushAsyncActWork(
                          returnValue,
                          resolve,
                          reject
                        );
                      });
                    } catch (error$0) {
                      ReactSharedInternals.thrownErrors.push(error$0);
                    }
                    if (0 < ReactSharedInternals.thrownErrors.length) {
                      var _thrownError = aggregateErrors(
                        ReactSharedInternals.thrownErrors
                      );
                      ReactSharedInternals.thrownErrors.length = 0;
                      reject(_thrownError);
                    }
                  } else resolve(returnValue);
                },
                function(error) {
                  popActScope(prevActQueue, prevActScopeDepth);
                  0 < ReactSharedInternals.thrownErrors.length ? (error = aggregateErrors(
                    ReactSharedInternals.thrownErrors
                  ), ReactSharedInternals.thrownErrors.length = 0, reject(error)) : reject(error);
                }
              );
            }
          };
        }
        var returnValue$jscomp$0 = result;
        popActScope(prevActQueue, prevActScopeDepth);
        0 === prevActScopeDepth && (flushActQueue(queue), 0 !== queue.length && queueSeveralMicrotasks(function() {
          didAwaitActCall || didWarnNoAwaitAct || (didWarnNoAwaitAct = true, console.error(
            "A component suspended inside an `act` scope, but the `act` call was not awaited. When testing React components that depend on asynchronous data, you must await the result:\n\nawait act(() => ...)"
          ));
        }), ReactSharedInternals.actQueue = null);
        if (0 < ReactSharedInternals.thrownErrors.length)
          throw callback = aggregateErrors(ReactSharedInternals.thrownErrors), ReactSharedInternals.thrownErrors.length = 0, callback;
        return {
          then: function(resolve, reject) {
            didAwaitActCall = true;
            0 === prevActScopeDepth ? (ReactSharedInternals.actQueue = queue, enqueueTask(function() {
              return recursivelyFlushAsyncActWork(
                returnValue$jscomp$0,
                resolve,
                reject
              );
            })) : resolve(returnValue$jscomp$0);
          }
        };
      };
      exports.cache = function(fn) {
        return function() {
          return fn.apply(null, arguments);
        };
      };
      exports.cacheSignal = function() {
        return null;
      };
      exports.captureOwnerStack = function() {
        var getCurrentStack = ReactSharedInternals.getCurrentStack;
        return null === getCurrentStack ? null : getCurrentStack();
      };
      exports.cloneElement = function(element, config, children) {
        if (null === element || void 0 === element)
          throw Error(
            "The argument must be a React element, but you passed " + element + "."
          );
        var props = assign({}, element.props), key = element.key, owner = element._owner;
        if (null != config) {
          var JSCompiler_inline_result;
          a: {
            if (hasOwnProperty.call(config, "ref") && (JSCompiler_inline_result = Object.getOwnPropertyDescriptor(
              config,
              "ref"
            ).get) && JSCompiler_inline_result.isReactWarning) {
              JSCompiler_inline_result = false;
              break a;
            }
            JSCompiler_inline_result = void 0 !== config.ref;
          }
          JSCompiler_inline_result && (owner = getOwner());
          hasValidKey(config) && (checkKeyStringCoercion(config.key), key = "" + config.key);
          for (propName in config)
            !hasOwnProperty.call(config, propName) || "key" === propName || "__self" === propName || "__source" === propName || "ref" === propName && void 0 === config.ref || (props[propName] = config[propName]);
        }
        var propName = arguments.length - 2;
        if (1 === propName) props.children = children;
        else if (1 < propName) {
          JSCompiler_inline_result = Array(propName);
          for (var i = 0; i < propName; i++)
            JSCompiler_inline_result[i] = arguments[i + 2];
          props.children = JSCompiler_inline_result;
        }
        props = ReactElement(
          element.type,
          key,
          props,
          owner,
          element._debugStack,
          element._debugTask
        );
        for (key = 2; key < arguments.length; key++)
          validateChildKeys(arguments[key]);
        return props;
      };
      exports.createContext = function(defaultValue) {
        defaultValue = {
          $$typeof: REACT_CONTEXT_TYPE,
          _currentValue: defaultValue,
          _currentValue2: defaultValue,
          _threadCount: 0,
          Provider: null,
          Consumer: null
        };
        defaultValue.Provider = defaultValue;
        defaultValue.Consumer = {
          $$typeof: REACT_CONSUMER_TYPE,
          _context: defaultValue
        };
        defaultValue._currentRenderer = null;
        defaultValue._currentRenderer2 = null;
        return defaultValue;
      };
      exports.createElement = function(type, config, children) {
        for (var i = 2; i < arguments.length; i++)
          validateChildKeys(arguments[i]);
        i = {};
        var key = null;
        if (null != config)
          for (propName in didWarnAboutOldJSXRuntime || !("__self" in config) || "key" in config || (didWarnAboutOldJSXRuntime = true, console.warn(
            "Your app (or one of its dependencies) is using an outdated JSX transform. Update to the modern JSX transform for faster performance: https://react.dev/link/new-jsx-transform"
          )), hasValidKey(config) && (checkKeyStringCoercion(config.key), key = "" + config.key), config)
            hasOwnProperty.call(config, propName) && "key" !== propName && "__self" !== propName && "__source" !== propName && (i[propName] = config[propName]);
        var childrenLength = arguments.length - 2;
        if (1 === childrenLength) i.children = children;
        else if (1 < childrenLength) {
          for (var childArray = Array(childrenLength), _i = 0; _i < childrenLength; _i++)
            childArray[_i] = arguments[_i + 2];
          Object.freeze && Object.freeze(childArray);
          i.children = childArray;
        }
        if (type && type.defaultProps)
          for (propName in childrenLength = type.defaultProps, childrenLength)
            void 0 === i[propName] && (i[propName] = childrenLength[propName]);
        key && defineKeyPropWarningGetter(
          i,
          "function" === typeof type ? type.displayName || type.name || "Unknown" : type
        );
        var propName = 1e4 > ReactSharedInternals.recentlyCreatedOwnerStacks++;
        return ReactElement(
          type,
          key,
          i,
          getOwner(),
          propName ? Error("react-stack-top-frame") : unknownOwnerDebugStack,
          propName ? createTask(getTaskName(type)) : unknownOwnerDebugTask
        );
      };
      exports.createRef = function() {
        var refObject = { current: null };
        Object.seal(refObject);
        return refObject;
      };
      exports.forwardRef = function(render2) {
        null != render2 && render2.$$typeof === REACT_MEMO_TYPE ? console.error(
          "forwardRef requires a render function but received a `memo` component. Instead of forwardRef(memo(...)), use memo(forwardRef(...))."
        ) : "function" !== typeof render2 ? console.error(
          "forwardRef requires a render function but was given %s.",
          null === render2 ? "null" : typeof render2
        ) : 0 !== render2.length && 2 !== render2.length && console.error(
          "forwardRef render functions accept exactly two parameters: props and ref. %s",
          1 === render2.length ? "Did you forget to use the ref parameter?" : "Any additional parameter will be undefined."
        );
        null != render2 && null != render2.defaultProps && console.error(
          "forwardRef render functions do not support defaultProps. Did you accidentally pass a React component?"
        );
        var elementType = { $$typeof: REACT_FORWARD_REF_TYPE, render: render2 }, ownName;
        Object.defineProperty(elementType, "displayName", {
          enumerable: false,
          configurable: true,
          get: function() {
            return ownName;
          },
          set: function(name) {
            ownName = name;
            render2.name || render2.displayName || (Object.defineProperty(render2, "name", { value: name }), render2.displayName = name);
          }
        });
        return elementType;
      };
      exports.isValidElement = isValidElement;
      exports.lazy = function(ctor) {
        ctor = { _status: -1, _result: ctor };
        var lazyType = {
          $$typeof: REACT_LAZY_TYPE,
          _payload: ctor,
          _init: lazyInitializer
        }, ioInfo = {
          name: "lazy",
          start: -1,
          end: -1,
          value: null,
          owner: null,
          debugStack: Error("react-stack-top-frame"),
          debugTask: console.createTask ? console.createTask("lazy()") : null
        };
        ctor._ioInfo = ioInfo;
        lazyType._debugInfo = [{ awaited: ioInfo }];
        return lazyType;
      };
      exports.memo = function(type, compare) {
        null == type && console.error(
          "memo: The first argument must be a component. Instead received: %s",
          null === type ? "null" : typeof type
        );
        compare = {
          $$typeof: REACT_MEMO_TYPE,
          type,
          compare: void 0 === compare ? null : compare
        };
        var ownName;
        Object.defineProperty(compare, "displayName", {
          enumerable: false,
          configurable: true,
          get: function() {
            return ownName;
          },
          set: function(name) {
            ownName = name;
            type.name || type.displayName || (Object.defineProperty(type, "name", { value: name }), type.displayName = name);
          }
        });
        return compare;
      };
      exports.startTransition = function(scope) {
        var prevTransition = ReactSharedInternals.T, currentTransition = {};
        currentTransition._updatedFibers = /* @__PURE__ */ new Set();
        ReactSharedInternals.T = currentTransition;
        try {
          var returnValue = scope(), onStartTransitionFinish = ReactSharedInternals.S;
          null !== onStartTransitionFinish && onStartTransitionFinish(currentTransition, returnValue);
          "object" === typeof returnValue && null !== returnValue && "function" === typeof returnValue.then && (ReactSharedInternals.asyncTransitions++, returnValue.then(releaseAsyncTransition, releaseAsyncTransition), returnValue.then(noop, reportGlobalError));
        } catch (error) {
          reportGlobalError(error);
        } finally {
          null === prevTransition && currentTransition._updatedFibers && (scope = currentTransition._updatedFibers.size, currentTransition._updatedFibers.clear(), 10 < scope && console.warn(
            "Detected a large number of updates inside startTransition. If this is due to a subscription please re-write it to use React provided hooks. Otherwise concurrent mode guarantees are off the table."
          )), null !== prevTransition && null !== currentTransition.types && (null !== prevTransition.types && prevTransition.types !== currentTransition.types && console.error(
            "We expected inner Transitions to have transferred the outer types set and that you cannot add to the outer Transition while inside the inner.This is a bug in React."
          ), prevTransition.types = currentTransition.types), ReactSharedInternals.T = prevTransition;
        }
      };
      exports.unstable_useCacheRefresh = function() {
        return resolveDispatcher().useCacheRefresh();
      };
      exports.use = function(usable) {
        return resolveDispatcher().use(usable);
      };
      exports.useActionState = function(action, initialState, permalink) {
        return resolveDispatcher().useActionState(
          action,
          initialState,
          permalink
        );
      };
      exports.useCallback = function(callback, deps) {
        return resolveDispatcher().useCallback(callback, deps);
      };
      exports.useContext = function(Context) {
        var dispatcher = resolveDispatcher();
        Context.$$typeof === REACT_CONSUMER_TYPE && console.error(
          "Calling useContext(Context.Consumer) is not supported and will cause bugs. Did you mean to call useContext(Context) instead?"
        );
        return dispatcher.useContext(Context);
      };
      exports.useDebugValue = function(value, formatterFn) {
        return resolveDispatcher().useDebugValue(value, formatterFn);
      };
      exports.useDeferredValue = function(value, initialValue) {
        return resolveDispatcher().useDeferredValue(value, initialValue);
      };
      exports.useEffect = function(create, deps) {
        null == create && console.warn(
          "React Hook useEffect requires an effect callback. Did you forget to pass a callback to the hook?"
        );
        return resolveDispatcher().useEffect(create, deps);
      };
      exports.useEffectEvent = function(callback) {
        return resolveDispatcher().useEffectEvent(callback);
      };
      exports.useId = function() {
        return resolveDispatcher().useId();
      };
      exports.useImperativeHandle = function(ref, create, deps) {
        return resolveDispatcher().useImperativeHandle(ref, create, deps);
      };
      exports.useInsertionEffect = function(create, deps) {
        null == create && console.warn(
          "React Hook useInsertionEffect requires an effect callback. Did you forget to pass a callback to the hook?"
        );
        return resolveDispatcher().useInsertionEffect(create, deps);
      };
      exports.useLayoutEffect = function(create, deps) {
        null == create && console.warn(
          "React Hook useLayoutEffect requires an effect callback. Did you forget to pass a callback to the hook?"
        );
        return resolveDispatcher().useLayoutEffect(create, deps);
      };
      exports.useMemo = function(create, deps) {
        return resolveDispatcher().useMemo(create, deps);
      };
      exports.useOptimistic = function(passthrough, reducer) {
        return resolveDispatcher().useOptimistic(passthrough, reducer);
      };
      exports.useReducer = function(reducer, initialArg, init) {
        return resolveDispatcher().useReducer(reducer, initialArg, init);
      };
      exports.useRef = function(initialValue) {
        return resolveDispatcher().useRef(initialValue);
      };
      exports.useState = function(initialState) {
        return resolveDispatcher().useState(initialState);
      };
      exports.useSyncExternalStore = function(subscribe, getSnapshot, getServerSnapshot) {
        return resolveDispatcher().useSyncExternalStore(
          subscribe,
          getSnapshot,
          getServerSnapshot
        );
      };
      exports.useTransition = function() {
        return resolveDispatcher().useTransition();
      };
      exports.version = "19.2.0";
      "undefined" !== typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ && "function" === typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop && __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop(Error());
    })();
  })(react_development, react_development.exports);
  return react_development.exports;
}
var hasRequiredReact;
function requireReact() {
  if (hasRequiredReact) return react.exports;
  hasRequiredReact = 1;
  if (process.env.NODE_ENV === "production") {
    react.exports = requireReact_production();
  } else {
    react.exports = requireReact_development();
  }
  return react.exports;
}
var reactExports = requireReact();
var jsxRuntime = { exports: {} };
var reactJsxRuntime_production = {};
var hasRequiredReactJsxRuntime_production;
function requireReactJsxRuntime_production() {
  if (hasRequiredReactJsxRuntime_production) return reactJsxRuntime_production;
  hasRequiredReactJsxRuntime_production = 1;
  var REACT_ELEMENT_TYPE = Symbol.for("react.transitional.element"), REACT_FRAGMENT_TYPE = Symbol.for("react.fragment");
  function jsxProd(type, config, maybeKey) {
    var key = null;
    void 0 !== maybeKey && (key = "" + maybeKey);
    void 0 !== config.key && (key = "" + config.key);
    if ("key" in config) {
      maybeKey = {};
      for (var propName in config)
        "key" !== propName && (maybeKey[propName] = config[propName]);
    } else maybeKey = config;
    config = maybeKey.ref;
    return {
      $$typeof: REACT_ELEMENT_TYPE,
      type,
      key,
      ref: void 0 !== config ? config : null,
      props: maybeKey
    };
  }
  reactJsxRuntime_production.Fragment = REACT_FRAGMENT_TYPE;
  reactJsxRuntime_production.jsx = jsxProd;
  reactJsxRuntime_production.jsxs = jsxProd;
  return reactJsxRuntime_production;
}
var reactJsxRuntime_development = {};
var hasRequiredReactJsxRuntime_development;
function requireReactJsxRuntime_development() {
  if (hasRequiredReactJsxRuntime_development) return reactJsxRuntime_development;
  hasRequiredReactJsxRuntime_development = 1;
  "production" !== process.env.NODE_ENV && (function() {
    function getComponentNameFromType(type) {
      if (null == type) return null;
      if ("function" === typeof type)
        return type.$$typeof === REACT_CLIENT_REFERENCE ? null : type.displayName || type.name || null;
      if ("string" === typeof type) return type;
      switch (type) {
        case REACT_FRAGMENT_TYPE:
          return "Fragment";
        case REACT_PROFILER_TYPE:
          return "Profiler";
        case REACT_STRICT_MODE_TYPE:
          return "StrictMode";
        case REACT_SUSPENSE_TYPE:
          return "Suspense";
        case REACT_SUSPENSE_LIST_TYPE:
          return "SuspenseList";
        case REACT_ACTIVITY_TYPE:
          return "Activity";
      }
      if ("object" === typeof type)
        switch ("number" === typeof type.tag && console.error(
          "Received an unexpected object in getComponentNameFromType(). This is likely a bug in React. Please file an issue."
        ), type.$$typeof) {
          case REACT_PORTAL_TYPE:
            return "Portal";
          case REACT_CONTEXT_TYPE:
            return type.displayName || "Context";
          case REACT_CONSUMER_TYPE:
            return (type._context.displayName || "Context") + ".Consumer";
          case REACT_FORWARD_REF_TYPE:
            var innerType = type.render;
            type = type.displayName;
            type || (type = innerType.displayName || innerType.name || "", type = "" !== type ? "ForwardRef(" + type + ")" : "ForwardRef");
            return type;
          case REACT_MEMO_TYPE:
            return innerType = type.displayName || null, null !== innerType ? innerType : getComponentNameFromType(type.type) || "Memo";
          case REACT_LAZY_TYPE:
            innerType = type._payload;
            type = type._init;
            try {
              return getComponentNameFromType(type(innerType));
            } catch (x) {
            }
        }
      return null;
    }
    function testStringCoercion(value) {
      return "" + value;
    }
    function checkKeyStringCoercion(value) {
      try {
        testStringCoercion(value);
        var JSCompiler_inline_result = false;
      } catch (e) {
        JSCompiler_inline_result = true;
      }
      if (JSCompiler_inline_result) {
        JSCompiler_inline_result = console;
        var JSCompiler_temp_const = JSCompiler_inline_result.error;
        var JSCompiler_inline_result$jscomp$0 = "function" === typeof Symbol && Symbol.toStringTag && value[Symbol.toStringTag] || value.constructor.name || "Object";
        JSCompiler_temp_const.call(
          JSCompiler_inline_result,
          "The provided key is an unsupported type %s. This value must be coerced to a string before using it here.",
          JSCompiler_inline_result$jscomp$0
        );
        return testStringCoercion(value);
      }
    }
    function getTaskName(type) {
      if (type === REACT_FRAGMENT_TYPE) return "<>";
      if ("object" === typeof type && null !== type && type.$$typeof === REACT_LAZY_TYPE)
        return "<...>";
      try {
        var name = getComponentNameFromType(type);
        return name ? "<" + name + ">" : "<...>";
      } catch (x) {
        return "<...>";
      }
    }
    function getOwner() {
      var dispatcher = ReactSharedInternals.A;
      return null === dispatcher ? null : dispatcher.getOwner();
    }
    function UnknownOwner() {
      return Error("react-stack-top-frame");
    }
    function hasValidKey(config) {
      if (hasOwnProperty.call(config, "key")) {
        var getter = Object.getOwnPropertyDescriptor(config, "key").get;
        if (getter && getter.isReactWarning) return false;
      }
      return void 0 !== config.key;
    }
    function defineKeyPropWarningGetter(props, displayName) {
      function warnAboutAccessingKey() {
        specialPropKeyWarningShown || (specialPropKeyWarningShown = true, console.error(
          "%s: `key` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://react.dev/link/special-props)",
          displayName
        ));
      }
      warnAboutAccessingKey.isReactWarning = true;
      Object.defineProperty(props, "key", {
        get: warnAboutAccessingKey,
        configurable: true
      });
    }
    function elementRefGetterWithDeprecationWarning() {
      var componentName = getComponentNameFromType(this.type);
      didWarnAboutElementRef[componentName] || (didWarnAboutElementRef[componentName] = true, console.error(
        "Accessing element.ref was removed in React 19. ref is now a regular prop. It will be removed from the JSX Element type in a future release."
      ));
      componentName = this.props.ref;
      return void 0 !== componentName ? componentName : null;
    }
    function ReactElement(type, key, props, owner, debugStack, debugTask) {
      var refProp = props.ref;
      type = {
        $$typeof: REACT_ELEMENT_TYPE,
        type,
        key,
        props,
        _owner: owner
      };
      null !== (void 0 !== refProp ? refProp : null) ? Object.defineProperty(type, "ref", {
        enumerable: false,
        get: elementRefGetterWithDeprecationWarning
      }) : Object.defineProperty(type, "ref", { enumerable: false, value: null });
      type._store = {};
      Object.defineProperty(type._store, "validated", {
        configurable: false,
        enumerable: false,
        writable: true,
        value: 0
      });
      Object.defineProperty(type, "_debugInfo", {
        configurable: false,
        enumerable: false,
        writable: true,
        value: null
      });
      Object.defineProperty(type, "_debugStack", {
        configurable: false,
        enumerable: false,
        writable: true,
        value: debugStack
      });
      Object.defineProperty(type, "_debugTask", {
        configurable: false,
        enumerable: false,
        writable: true,
        value: debugTask
      });
      Object.freeze && (Object.freeze(type.props), Object.freeze(type));
      return type;
    }
    function jsxDEVImpl(type, config, maybeKey, isStaticChildren, debugStack, debugTask) {
      var children = config.children;
      if (void 0 !== children)
        if (isStaticChildren)
          if (isArrayImpl(children)) {
            for (isStaticChildren = 0; isStaticChildren < children.length; isStaticChildren++)
              validateChildKeys(children[isStaticChildren]);
            Object.freeze && Object.freeze(children);
          } else
            console.error(
              "React.jsx: Static children should always be an array. You are likely explicitly calling React.jsxs or React.jsxDEV. Use the Babel transform instead."
            );
        else validateChildKeys(children);
      if (hasOwnProperty.call(config, "key")) {
        children = getComponentNameFromType(type);
        var keys = Object.keys(config).filter(function(k) {
          return "key" !== k;
        });
        isStaticChildren = 0 < keys.length ? "{key: someKey, " + keys.join(": ..., ") + ": ...}" : "{key: someKey}";
        didWarnAboutKeySpread[children + isStaticChildren] || (keys = 0 < keys.length ? "{" + keys.join(": ..., ") + ": ...}" : "{}", console.error(
          'A props object containing a "key" prop is being spread into JSX:\n  let props = %s;\n  <%s {...props} />\nReact keys must be passed directly to JSX without using spread:\n  let props = %s;\n  <%s key={someKey} {...props} />',
          isStaticChildren,
          children,
          keys,
          children
        ), didWarnAboutKeySpread[children + isStaticChildren] = true);
      }
      children = null;
      void 0 !== maybeKey && (checkKeyStringCoercion(maybeKey), children = "" + maybeKey);
      hasValidKey(config) && (checkKeyStringCoercion(config.key), children = "" + config.key);
      if ("key" in config) {
        maybeKey = {};
        for (var propName in config)
          "key" !== propName && (maybeKey[propName] = config[propName]);
      } else maybeKey = config;
      children && defineKeyPropWarningGetter(
        maybeKey,
        "function" === typeof type ? type.displayName || type.name || "Unknown" : type
      );
      return ReactElement(
        type,
        children,
        maybeKey,
        getOwner(),
        debugStack,
        debugTask
      );
    }
    function validateChildKeys(node) {
      isValidElement(node) ? node._store && (node._store.validated = 1) : "object" === typeof node && null !== node && node.$$typeof === REACT_LAZY_TYPE && ("fulfilled" === node._payload.status ? isValidElement(node._payload.value) && node._payload.value._store && (node._payload.value._store.validated = 1) : node._store && (node._store.validated = 1));
    }
    function isValidElement(object) {
      return "object" === typeof object && null !== object && object.$$typeof === REACT_ELEMENT_TYPE;
    }
    var React = requireReact(), REACT_ELEMENT_TYPE = Symbol.for("react.transitional.element"), REACT_PORTAL_TYPE = Symbol.for("react.portal"), REACT_FRAGMENT_TYPE = Symbol.for("react.fragment"), REACT_STRICT_MODE_TYPE = Symbol.for("react.strict_mode"), REACT_PROFILER_TYPE = Symbol.for("react.profiler"), REACT_CONSUMER_TYPE = Symbol.for("react.consumer"), REACT_CONTEXT_TYPE = Symbol.for("react.context"), REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref"), REACT_SUSPENSE_TYPE = Symbol.for("react.suspense"), REACT_SUSPENSE_LIST_TYPE = Symbol.for("react.suspense_list"), REACT_MEMO_TYPE = Symbol.for("react.memo"), REACT_LAZY_TYPE = Symbol.for("react.lazy"), REACT_ACTIVITY_TYPE = Symbol.for("react.activity"), REACT_CLIENT_REFERENCE = Symbol.for("react.client.reference"), ReactSharedInternals = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, hasOwnProperty = Object.prototype.hasOwnProperty, isArrayImpl = Array.isArray, createTask = console.createTask ? console.createTask : function() {
      return null;
    };
    React = {
      react_stack_bottom_frame: function(callStackForError) {
        return callStackForError();
      }
    };
    var specialPropKeyWarningShown;
    var didWarnAboutElementRef = {};
    var unknownOwnerDebugStack = React.react_stack_bottom_frame.bind(
      React,
      UnknownOwner
    )();
    var unknownOwnerDebugTask = createTask(getTaskName(UnknownOwner));
    var didWarnAboutKeySpread = {};
    reactJsxRuntime_development.Fragment = REACT_FRAGMENT_TYPE;
    reactJsxRuntime_development.jsx = function(type, config, maybeKey) {
      var trackActualOwner = 1e4 > ReactSharedInternals.recentlyCreatedOwnerStacks++;
      return jsxDEVImpl(
        type,
        config,
        maybeKey,
        false,
        trackActualOwner ? Error("react-stack-top-frame") : unknownOwnerDebugStack,
        trackActualOwner ? createTask(getTaskName(type)) : unknownOwnerDebugTask
      );
    };
    reactJsxRuntime_development.jsxs = function(type, config, maybeKey) {
      var trackActualOwner = 1e4 > ReactSharedInternals.recentlyCreatedOwnerStacks++;
      return jsxDEVImpl(
        type,
        config,
        maybeKey,
        true,
        trackActualOwner ? Error("react-stack-top-frame") : unknownOwnerDebugStack,
        trackActualOwner ? createTask(getTaskName(type)) : unknownOwnerDebugTask
      );
    };
  })();
  return reactJsxRuntime_development;
}
var hasRequiredJsxRuntime;
function requireJsxRuntime() {
  if (hasRequiredJsxRuntime) return jsxRuntime.exports;
  hasRequiredJsxRuntime = 1;
  if (process.env.NODE_ENV === "production") {
    jsxRuntime.exports = requireReactJsxRuntime_production();
  } else {
    jsxRuntime.exports = requireReactJsxRuntime_development();
  }
  return jsxRuntime.exports;
}
var jsxRuntimeExports = requireJsxRuntime();
var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};
var plainTextSelectors = [
  { selector: "img", format: "skip" },
  { selector: "[data-skip-in-text=true]", format: "skip" },
  {
    selector: "a",
    options: { linkBrackets: false }
  }
];
function recursivelyMapDoc(doc, callback) {
  if (Array.isArray(doc)) {
    return doc.map((innerDoc) => recursivelyMapDoc(innerDoc, callback));
  }
  if (typeof doc === "object") {
    if (doc.type === "group") {
      return __spreadProps(__spreadValues({}, doc), {
        contents: recursivelyMapDoc(doc.contents, callback),
        expandedStates: recursivelyMapDoc(
          doc.expandedStates,
          callback
        )
      });
    }
    if ("contents" in doc) {
      return __spreadProps(__spreadValues({}, doc), {
        contents: recursivelyMapDoc(doc.contents, callback)
      });
    }
    if ("parts" in doc) {
      return __spreadProps(__spreadValues({}, doc), {
        parts: recursivelyMapDoc(doc.parts, callback)
      });
    }
    if (doc.type === "if-break") {
      return __spreadProps(__spreadValues({}, doc), {
        breakContents: recursivelyMapDoc(doc.breakContents, callback),
        flatContents: recursivelyMapDoc(doc.flatContents, callback)
      });
    }
  }
  return callback(doc);
}
var modifiedHtml = __spreadValues({}, html);
if (modifiedHtml.printers) {
  const previousPrint = modifiedHtml.printers.html.print;
  modifiedHtml.printers.html.print = (path, options, print, args) => {
    const node = path.getNode();
    const rawPrintingResult = previousPrint(path, options, print, args);
    if (node.type === "ieConditionalComment") {
      const printingResult = recursivelyMapDoc(rawPrintingResult, (doc) => {
        if (typeof doc === "object" && doc.type === "line") {
          return doc.soft ? "" : " ";
        }
        return doc;
      });
      return printingResult;
    }
    return rawPrintingResult;
  };
}
var defaults = {
  endOfLine: "lf",
  tabWidth: 2,
  plugins: [modifiedHtml],
  bracketSameLine: true,
  parser: "html"
};
var pretty = (str, options = {}) => {
  return Jn(str.replaceAll("\0", ""), __spreadValues(__spreadValues({}, defaults), options));
};
var decoder = new TextDecoder("utf-8");
var readStream = (stream) => __async(void 0, null, function* () {
  let result = "";
  if ("pipeTo" in stream) {
    const writableStream = new WritableStream({
      write(chunk) {
        result += decoder.decode(chunk);
      }
    });
    yield stream.pipeTo(writableStream);
  } else {
    const writable = new Writable({
      write(chunk, _encoding, callback) {
        result += decoder.decode(chunk);
        callback();
      }
    });
    stream.pipe(writable);
    yield new Promise((resolve, reject) => {
      writable.on("error", reject);
      writable.on("close", () => {
        resolve();
      });
    });
  }
  return result;
});
var render = (node, options) => __async(void 0, null, function* () {
  const suspendedElement = /* @__PURE__ */ jsxRuntimeExports.jsx(reactExports.Suspense, { children: node });
  const reactDOMServer = yield import('./server.node-COFV6FTS.js').then((n) => n.s).then(
    // This is beacuse react-dom/server is CJS
    (m) => m.default
  );
  let html2;
  if (Object.hasOwn(reactDOMServer, "renderToReadableStream")) {
    html2 = yield readStream(
      yield reactDOMServer.renderToReadableStream(suspendedElement)
    );
  } else {
    yield new Promise((resolve, reject) => {
      const stream = reactDOMServer.renderToPipeableStream(suspendedElement, {
        onAllReady() {
          return __async(this, null, function* () {
            html2 = yield readStream(stream);
            resolve();
          });
        },
        onError(error) {
          reject(error);
        }
      });
    });
  }
  if (options == null ? void 0 : options.plainText) {
    return convert(html2, __spreadValues({
      selectors: plainTextSelectors
    }, options.htmlToTextOptions));
  }
  const doctype = '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">';
  const document = `${doctype}${html2.replace(/<!DOCTYPE.*?>/, "")}`;
  if (options == null ? void 0 : options.pretty) {
    return pretty(document);
  }
  return document;
});
var renderAsync = (element, options) => {
  return render(element, options);
};
const index = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  plainTextSelectors,
  pretty,
  render,
  renderAsync
}, Symbol.toStringTag, { value: "Module" }));

export { index as i, requireReact as r };
//# sourceMappingURL=index13-GlgWUii_.js.map
