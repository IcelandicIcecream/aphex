import"../chunks/DsnmJJEf.js";import{i as g,a as h,b as t,p as B,c as G,f as y,d as n,n as x,r as d,s as $,m as H,w as O,g as Q,v as k}from"../chunks/DWBROaph.js";import{l as A,s as D,i as I}from"../chunks/CrQaW3DA.js";import{S as M}from"../chunks/Da8QwHVz.js";import{B as N}from"../chunks/CQxSK_kJ.js";import{p as T}from"../chunks/DL8tdTp6.js";import{a as j}from"../chunks/BSYjuwBa.js";import{g as q}from"../chunks/CrOXdnIQ.js";import{a as C}from"../chunks/Cpo51NEr.js";import{r as E}from"../chunks/BegLjn8u.js";import"../chunks/D8BKmG1w.js";import{I as F,s as J}from"../chunks/CgH_2WnA.js";function K(l,a){const v=A(a,["children","$$slots","$$events","$$legacy"]);/**
 * @license lucide-svelte v0.544.0 - ISC
 *
 * ISC License
 *
 * Copyright (c) for portions of Lucide are held by Cole Bemis 2013-2023 as part of Feather (MIT). All other copyright (c) for Lucide are held by Lucide Contributors 2025.
 *
 * Permission to use, copy, modify, and/or distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies.
 *
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
 * WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
 * ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
 * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
 * ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
 * OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 *
 * ---
 *
 * The MIT License (MIT) (for portions derived from Feather)
 *
 * Copyright (c) 2013-2023 Cole Bemis
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 */const m=[["path",{d:"M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"}],["path",{d:"M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"}]];F(l,D({name:"house"},()=>v,{get iconNode(){return m},children:(s,_)=>{var o=g(),f=h(o);J(f,a,"default",{}),t(s,o)},$$slots:{default:!0}}))}var R=y('<div class="flex h-screen flex-col"><div class="bg-muted/50 flex items-center justify-between border-b px-4 py-2"><div class="flex items-center gap-2"><!> <span class="text-muted-foreground text-sm">Admin Panel</span></div> <!></div> <div class="flex-1 overflow-hidden"><!></div></div>'),U=y("<div>Loading...</div>");function na(l,a){B(a,!0);const v=k(()=>T.data.graphqlSettings?.enableGraphiQL??!1);async function m(){await j.signOut(),q(E("/"))}var s=g(),_=h(s);{var o=e=>{var r=R(),p=n(r),c=n(p),S=n(c);K(S,{class:"text-muted-foreground h-4 w-4"}),x(2),d(c);var w=$(c,2);N(w,{variant:"ghost",size:"sm",href:"/",children:(u,P)=>{x();var i=H("← Back to Home");t(u,i)},$$slots:{default:!0}}),d(p);var b=$(p,2),L=n(b);M(L,{get data(){return a.data.sidebarData},onSignOut:m,get enableGraphiQL(){return Q(v)},get activeTab(){return C},children:(u,P)=>{var i=g(),z=h(i);O(z,()=>a.children),t(u,i)},$$slots:{default:!0}}),d(b),d(r),t(e,r)},f=e=>{var r=U();t(e,r)};I(_,e=>{a.data?.sidebarData?e(o):e(f,!1)})}t(l,s),G()}export{na as component};
