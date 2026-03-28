import { c as cmsLogger } from './logger-C1WBmfZZ.js';
import { g as getDefaultExportFromCjs } from './_commonjsHelpers-C1uiShF5.js';

var dayjs_min$1 = { exports: {} };
var dayjs_min = dayjs_min$1.exports;
var hasRequiredDayjs_min;
function requireDayjs_min() {
  if (hasRequiredDayjs_min) return dayjs_min$1.exports;
  hasRequiredDayjs_min = 1;
  (function(module, exports) {
    !(function(t, e) {
      module.exports = e();
    })(dayjs_min, (function() {
      var t = 1e3, e = 6e4, n = 36e5, r = "millisecond", i = "second", s = "minute", u = "hour", a = "day", o = "week", c = "month", f = "quarter", h = "year", d = "date", l = "Invalid Date", $ = /^(\d{4})[-/]?(\d{1,2})?[-/]?(\d{0,2})[Tt\s]*(\d{1,2})?:?(\d{1,2})?:?(\d{1,2})?[.:]?(\d+)?$/, y = /\[([^\]]+)]|Y{1,4}|M{1,4}|D{1,2}|d{1,4}|H{1,2}|h{1,2}|a|A|m{1,2}|s{1,2}|Z{1,2}|SSS/g, M = { name: "en", weekdays: "Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday".split("_"), months: "January_February_March_April_May_June_July_August_September_October_November_December".split("_"), ordinal: function(t2) {
        var e2 = ["th", "st", "nd", "rd"], n2 = t2 % 100;
        return "[" + t2 + (e2[(n2 - 20) % 10] || e2[n2] || e2[0]) + "]";
      } }, m = function(t2, e2, n2) {
        var r2 = String(t2);
        return !r2 || r2.length >= e2 ? t2 : "" + Array(e2 + 1 - r2.length).join(n2) + t2;
      }, v = { s: m, z: function(t2) {
        var e2 = -t2.utcOffset(), n2 = Math.abs(e2), r2 = Math.floor(n2 / 60), i2 = n2 % 60;
        return (e2 <= 0 ? "+" : "-") + m(r2, 2, "0") + ":" + m(i2, 2, "0");
      }, m: function t2(e2, n2) {
        if (e2.date() < n2.date()) return -t2(n2, e2);
        var r2 = 12 * (n2.year() - e2.year()) + (n2.month() - e2.month()), i2 = e2.clone().add(r2, c), s2 = n2 - i2 < 0, u2 = e2.clone().add(r2 + (s2 ? -1 : 1), c);
        return +(-(r2 + (n2 - i2) / (s2 ? i2 - u2 : u2 - i2)) || 0);
      }, a: function(t2) {
        return t2 < 0 ? Math.ceil(t2) || 0 : Math.floor(t2);
      }, p: function(t2) {
        return { M: c, y: h, w: o, d: a, D: d, h: u, m: s, s: i, ms: r, Q: f }[t2] || String(t2 || "").toLowerCase().replace(/s$/, "");
      }, u: function(t2) {
        return void 0 === t2;
      } }, g = "en", D = {};
      D[g] = M;
      var p = "$isDayjsObject", S = function(t2) {
        return t2 instanceof _ || !(!t2 || !t2[p]);
      }, w = function t2(e2, n2, r2) {
        var i2;
        if (!e2) return g;
        if ("string" == typeof e2) {
          var s2 = e2.toLowerCase();
          D[s2] && (i2 = s2), n2 && (D[s2] = n2, i2 = s2);
          var u2 = e2.split("-");
          if (!i2 && u2.length > 1) return t2(u2[0]);
        } else {
          var a2 = e2.name;
          D[a2] = e2, i2 = a2;
        }
        return !r2 && i2 && (g = i2), i2 || !r2 && g;
      }, O = function(t2, e2) {
        if (S(t2)) return t2.clone();
        var n2 = "object" == typeof e2 ? e2 : {};
        return n2.date = t2, n2.args = arguments, new _(n2);
      }, b = v;
      b.l = w, b.i = S, b.w = function(t2, e2) {
        return O(t2, { locale: e2.$L, utc: e2.$u, x: e2.$x, $offset: e2.$offset });
      };
      var _ = (function() {
        function M2(t2) {
          this.$L = w(t2.locale, null, true), this.parse(t2), this.$x = this.$x || t2.x || {}, this[p] = true;
        }
        var m2 = M2.prototype;
        return m2.parse = function(t2) {
          this.$d = (function(t3) {
            var e2 = t3.date, n2 = t3.utc;
            if (null === e2) return /* @__PURE__ */ new Date(NaN);
            if (b.u(e2)) return /* @__PURE__ */ new Date();
            if (e2 instanceof Date) return new Date(e2);
            if ("string" == typeof e2 && !/Z$/i.test(e2)) {
              var r2 = e2.match($);
              if (r2) {
                var i2 = r2[2] - 1 || 0, s2 = (r2[7] || "0").substring(0, 3);
                return n2 ? new Date(Date.UTC(r2[1], i2, r2[3] || 1, r2[4] || 0, r2[5] || 0, r2[6] || 0, s2)) : new Date(r2[1], i2, r2[3] || 1, r2[4] || 0, r2[5] || 0, r2[6] || 0, s2);
              }
            }
            return new Date(e2);
          })(t2), this.init();
        }, m2.init = function() {
          var t2 = this.$d;
          this.$y = t2.getFullYear(), this.$M = t2.getMonth(), this.$D = t2.getDate(), this.$W = t2.getDay(), this.$H = t2.getHours(), this.$m = t2.getMinutes(), this.$s = t2.getSeconds(), this.$ms = t2.getMilliseconds();
        }, m2.$utils = function() {
          return b;
        }, m2.isValid = function() {
          return !(this.$d.toString() === l);
        }, m2.isSame = function(t2, e2) {
          var n2 = O(t2);
          return this.startOf(e2) <= n2 && n2 <= this.endOf(e2);
        }, m2.isAfter = function(t2, e2) {
          return O(t2) < this.startOf(e2);
        }, m2.isBefore = function(t2, e2) {
          return this.endOf(e2) < O(t2);
        }, m2.$g = function(t2, e2, n2) {
          return b.u(t2) ? this[e2] : this.set(n2, t2);
        }, m2.unix = function() {
          return Math.floor(this.valueOf() / 1e3);
        }, m2.valueOf = function() {
          return this.$d.getTime();
        }, m2.startOf = function(t2, e2) {
          var n2 = this, r2 = !!b.u(e2) || e2, f2 = b.p(t2), l2 = function(t3, e3) {
            var i2 = b.w(n2.$u ? Date.UTC(n2.$y, e3, t3) : new Date(n2.$y, e3, t3), n2);
            return r2 ? i2 : i2.endOf(a);
          }, $2 = function(t3, e3) {
            return b.w(n2.toDate()[t3].apply(n2.toDate("s"), (r2 ? [0, 0, 0, 0] : [23, 59, 59, 999]).slice(e3)), n2);
          }, y2 = this.$W, M3 = this.$M, m3 = this.$D, v2 = "set" + (this.$u ? "UTC" : "");
          switch (f2) {
            case h:
              return r2 ? l2(1, 0) : l2(31, 11);
            case c:
              return r2 ? l2(1, M3) : l2(0, M3 + 1);
            case o:
              var g2 = this.$locale().weekStart || 0, D2 = (y2 < g2 ? y2 + 7 : y2) - g2;
              return l2(r2 ? m3 - D2 : m3 + (6 - D2), M3);
            case a:
            case d:
              return $2(v2 + "Hours", 0);
            case u:
              return $2(v2 + "Minutes", 1);
            case s:
              return $2(v2 + "Seconds", 2);
            case i:
              return $2(v2 + "Milliseconds", 3);
            default:
              return this.clone();
          }
        }, m2.endOf = function(t2) {
          return this.startOf(t2, false);
        }, m2.$set = function(t2, e2) {
          var n2, o2 = b.p(t2), f2 = "set" + (this.$u ? "UTC" : ""), l2 = (n2 = {}, n2[a] = f2 + "Date", n2[d] = f2 + "Date", n2[c] = f2 + "Month", n2[h] = f2 + "FullYear", n2[u] = f2 + "Hours", n2[s] = f2 + "Minutes", n2[i] = f2 + "Seconds", n2[r] = f2 + "Milliseconds", n2)[o2], $2 = o2 === a ? this.$D + (e2 - this.$W) : e2;
          if (o2 === c || o2 === h) {
            var y2 = this.clone().set(d, 1);
            y2.$d[l2]($2), y2.init(), this.$d = y2.set(d, Math.min(this.$D, y2.daysInMonth())).$d;
          } else l2 && this.$d[l2]($2);
          return this.init(), this;
        }, m2.set = function(t2, e2) {
          return this.clone().$set(t2, e2);
        }, m2.get = function(t2) {
          return this[b.p(t2)]();
        }, m2.add = function(r2, f2) {
          var d2, l2 = this;
          r2 = Number(r2);
          var $2 = b.p(f2), y2 = function(t2) {
            var e2 = O(l2);
            return b.w(e2.date(e2.date() + Math.round(t2 * r2)), l2);
          };
          if ($2 === c) return this.set(c, this.$M + r2);
          if ($2 === h) return this.set(h, this.$y + r2);
          if ($2 === a) return y2(1);
          if ($2 === o) return y2(7);
          var M3 = (d2 = {}, d2[s] = e, d2[u] = n, d2[i] = t, d2)[$2] || 1, m3 = this.$d.getTime() + r2 * M3;
          return b.w(m3, this);
        }, m2.subtract = function(t2, e2) {
          return this.add(-1 * t2, e2);
        }, m2.format = function(t2) {
          var e2 = this, n2 = this.$locale();
          if (!this.isValid()) return n2.invalidDate || l;
          var r2 = t2 || "YYYY-MM-DDTHH:mm:ssZ", i2 = b.z(this), s2 = this.$H, u2 = this.$m, a2 = this.$M, o2 = n2.weekdays, c2 = n2.months, f2 = n2.meridiem, h2 = function(t3, n3, i3, s3) {
            return t3 && (t3[n3] || t3(e2, r2)) || i3[n3].slice(0, s3);
          }, d2 = function(t3) {
            return b.s(s2 % 12 || 12, t3, "0");
          }, $2 = f2 || function(t3, e3, n3) {
            var r3 = t3 < 12 ? "AM" : "PM";
            return n3 ? r3.toLowerCase() : r3;
          };
          return r2.replace(y, (function(t3, r3) {
            return r3 || (function(t4) {
              switch (t4) {
                case "YY":
                  return String(e2.$y).slice(-2);
                case "YYYY":
                  return b.s(e2.$y, 4, "0");
                case "M":
                  return a2 + 1;
                case "MM":
                  return b.s(a2 + 1, 2, "0");
                case "MMM":
                  return h2(n2.monthsShort, a2, c2, 3);
                case "MMMM":
                  return h2(c2, a2);
                case "D":
                  return e2.$D;
                case "DD":
                  return b.s(e2.$D, 2, "0");
                case "d":
                  return String(e2.$W);
                case "dd":
                  return h2(n2.weekdaysMin, e2.$W, o2, 2);
                case "ddd":
                  return h2(n2.weekdaysShort, e2.$W, o2, 3);
                case "dddd":
                  return o2[e2.$W];
                case "H":
                  return String(s2);
                case "HH":
                  return b.s(s2, 2, "0");
                case "h":
                  return d2(1);
                case "hh":
                  return d2(2);
                case "a":
                  return $2(s2, u2, true);
                case "A":
                  return $2(s2, u2, false);
                case "m":
                  return String(u2);
                case "mm":
                  return b.s(u2, 2, "0");
                case "s":
                  return String(e2.$s);
                case "ss":
                  return b.s(e2.$s, 2, "0");
                case "SSS":
                  return b.s(e2.$ms, 3, "0");
                case "Z":
                  return i2;
              }
              return null;
            })(t3) || i2.replace(":", "");
          }));
        }, m2.utcOffset = function() {
          return 15 * -Math.round(this.$d.getTimezoneOffset() / 15);
        }, m2.diff = function(r2, d2, l2) {
          var $2, y2 = this, M3 = b.p(d2), m3 = O(r2), v2 = (m3.utcOffset() - this.utcOffset()) * e, g2 = this - m3, D2 = function() {
            return b.m(y2, m3);
          };
          switch (M3) {
            case h:
              $2 = D2() / 12;
              break;
            case c:
              $2 = D2();
              break;
            case f:
              $2 = D2() / 3;
              break;
            case o:
              $2 = (g2 - v2) / 6048e5;
              break;
            case a:
              $2 = (g2 - v2) / 864e5;
              break;
            case u:
              $2 = g2 / n;
              break;
            case s:
              $2 = g2 / e;
              break;
            case i:
              $2 = g2 / t;
              break;
            default:
              $2 = g2;
          }
          return l2 ? $2 : b.a($2);
        }, m2.daysInMonth = function() {
          return this.endOf(c).$D;
        }, m2.$locale = function() {
          return D[this.$L];
        }, m2.locale = function(t2, e2) {
          if (!t2) return this.$L;
          var n2 = this.clone(), r2 = w(t2, e2, true);
          return r2 && (n2.$L = r2), n2;
        }, m2.clone = function() {
          return b.w(this.$d, this);
        }, m2.toDate = function() {
          return new Date(this.valueOf());
        }, m2.toJSON = function() {
          return this.isValid() ? this.toISOString() : null;
        }, m2.toISOString = function() {
          return this.$d.toISOString();
        }, m2.toString = function() {
          return this.$d.toUTCString();
        }, M2;
      })(), k = _.prototype;
      return O.prototype = k, [["$ms", r], ["$s", i], ["$m", s], ["$H", u], ["$W", a], ["$M", c], ["$y", h], ["$D", d]].forEach((function(t2) {
        k[t2[1]] = function(e2) {
          return this.$g(e2, t2[0], t2[1]);
        };
      })), O.extend = function(t2, e2) {
        return t2.$i || (t2(e2, _, O), t2.$i = true), O;
      }, O.locale = w, O.isDayjs = S, O.unix = function(t2) {
        return O(1e3 * t2);
      }, O.en = D[g], O.Ls = D, O.p = {}, O;
    }));
  })(dayjs_min$1);
  return dayjs_min$1.exports;
}
var dayjs_minExports = requireDayjs_min();
const dayjs = /* @__PURE__ */ getDefaultExportFromCjs(dayjs_minExports);
var customParseFormat$2 = { exports: {} };
var customParseFormat$1 = customParseFormat$2.exports;
var hasRequiredCustomParseFormat;
function requireCustomParseFormat() {
  if (hasRequiredCustomParseFormat) return customParseFormat$2.exports;
  hasRequiredCustomParseFormat = 1;
  (function(module, exports) {
    !(function(e, t) {
      module.exports = t();
    })(customParseFormat$1, (function() {
      var e = { LTS: "h:mm:ss A", LT: "h:mm A", L: "MM/DD/YYYY", LL: "MMMM D, YYYY", LLL: "MMMM D, YYYY h:mm A", LLLL: "dddd, MMMM D, YYYY h:mm A" }, t = /(\[[^[]*\])|([-_:/.,()\s]+)|(A|a|Q|YYYY|YY?|ww?|MM?M?M?|Do|DD?|hh?|HH?|mm?|ss?|S{1,3}|z|ZZ?)/g, n = /\d/, r = /\d\d/, i = /\d\d?/, o = /\d*[^-_:/,()\s\d]+/, s = {}, a = function(e2) {
        return (e2 = +e2) + (e2 > 68 ? 1900 : 2e3);
      };
      var f = function(e2) {
        return function(t2) {
          this[e2] = +t2;
        };
      }, h = [/[+-]\d\d:?(\d\d)?|Z/, function(e2) {
        (this.zone || (this.zone = {})).offset = (function(e3) {
          if (!e3) return 0;
          if ("Z" === e3) return 0;
          var t2 = e3.match(/([+-]|\d\d)/g), n2 = 60 * t2[1] + (+t2[2] || 0);
          return 0 === n2 ? 0 : "+" === t2[0] ? -n2 : n2;
        })(e2);
      }], u = function(e2) {
        var t2 = s[e2];
        return t2 && (t2.indexOf ? t2 : t2.s.concat(t2.f));
      }, d = function(e2, t2) {
        var n2, r2 = s.meridiem;
        if (r2) {
          for (var i2 = 1; i2 <= 24; i2 += 1) if (e2.indexOf(r2(i2, 0, t2)) > -1) {
            n2 = i2 > 12;
            break;
          }
        } else n2 = e2 === (t2 ? "pm" : "PM");
        return n2;
      }, c = { A: [o, function(e2) {
        this.afternoon = d(e2, false);
      }], a: [o, function(e2) {
        this.afternoon = d(e2, true);
      }], Q: [n, function(e2) {
        this.month = 3 * (e2 - 1) + 1;
      }], S: [n, function(e2) {
        this.milliseconds = 100 * +e2;
      }], SS: [r, function(e2) {
        this.milliseconds = 10 * +e2;
      }], SSS: [/\d{3}/, function(e2) {
        this.milliseconds = +e2;
      }], s: [i, f("seconds")], ss: [i, f("seconds")], m: [i, f("minutes")], mm: [i, f("minutes")], H: [i, f("hours")], h: [i, f("hours")], HH: [i, f("hours")], hh: [i, f("hours")], D: [i, f("day")], DD: [r, f("day")], Do: [o, function(e2) {
        var t2 = s.ordinal, n2 = e2.match(/\d+/);
        if (this.day = n2[0], t2) for (var r2 = 1; r2 <= 31; r2 += 1) t2(r2).replace(/\[|\]/g, "") === e2 && (this.day = r2);
      }], w: [i, f("week")], ww: [r, f("week")], M: [i, f("month")], MM: [r, f("month")], MMM: [o, function(e2) {
        var t2 = u("months"), n2 = (u("monthsShort") || t2.map((function(e3) {
          return e3.slice(0, 3);
        }))).indexOf(e2) + 1;
        if (n2 < 1) throw new Error();
        this.month = n2 % 12 || n2;
      }], MMMM: [o, function(e2) {
        var t2 = u("months").indexOf(e2) + 1;
        if (t2 < 1) throw new Error();
        this.month = t2 % 12 || t2;
      }], Y: [/[+-]?\d+/, f("year")], YY: [r, function(e2) {
        this.year = a(e2);
      }], YYYY: [/\d{4}/, f("year")], Z: h, ZZ: h };
      function l(n2) {
        var r2, i2;
        r2 = n2, i2 = s && s.formats;
        for (var o2 = (n2 = r2.replace(/(\[[^\]]+])|(LTS?|l{1,4}|L{1,4})/g, (function(t2, n3, r3) {
          var o3 = r3 && r3.toUpperCase();
          return n3 || i2[r3] || e[r3] || i2[o3].replace(/(\[[^\]]+])|(MMMM|MM|DD|dddd)/g, (function(e2, t3, n4) {
            return t3 || n4.slice(1);
          }));
        }))).match(t), a2 = o2.length, f2 = 0; f2 < a2; f2 += 1) {
          var h2 = o2[f2], u2 = c[h2], d2 = u2 && u2[0], l2 = u2 && u2[1];
          o2[f2] = l2 ? { regex: d2, parser: l2 } : h2.replace(/^\[|\]$/g, "");
        }
        return function(e2) {
          for (var t2 = {}, n3 = 0, r3 = 0; n3 < a2; n3 += 1) {
            var i3 = o2[n3];
            if ("string" == typeof i3) r3 += i3.length;
            else {
              var s2 = i3.regex, f3 = i3.parser, h3 = e2.slice(r3), u3 = s2.exec(h3)[0];
              f3.call(t2, u3), e2 = e2.replace(u3, "");
            }
          }
          return (function(e3) {
            var t3 = e3.afternoon;
            if (void 0 !== t3) {
              var n4 = e3.hours;
              t3 ? n4 < 12 && (e3.hours += 12) : 12 === n4 && (e3.hours = 0), delete e3.afternoon;
            }
          })(t2), t2;
        };
      }
      return function(e2, t2, n2) {
        n2.p.customParseFormat = true, e2 && e2.parseTwoDigitYear && (a = e2.parseTwoDigitYear);
        var r2 = t2.prototype, i2 = r2.parse;
        r2.parse = function(e3) {
          var t3 = e3.date, r3 = e3.utc, o2 = e3.args;
          this.$u = r3;
          var a2 = o2[1];
          if ("string" == typeof a2) {
            var f2 = true === o2[2], h2 = true === o2[3], u2 = f2 || h2, d2 = o2[2];
            h2 && (d2 = o2[2]), s = this.$locale(), !f2 && d2 && (s = n2.Ls[d2]), this.$d = (function(e4, t4, n3, r4) {
              try {
                if (["x", "X"].indexOf(t4) > -1) return new Date(("X" === t4 ? 1e3 : 1) * e4);
                var i3 = l(t4)(e4), o3 = i3.year, s2 = i3.month, a3 = i3.day, f3 = i3.hours, h3 = i3.minutes, u3 = i3.seconds, d3 = i3.milliseconds, c3 = i3.zone, m2 = i3.week, M2 = /* @__PURE__ */ new Date(), Y = a3 || (o3 || s2 ? 1 : M2.getDate()), p = o3 || M2.getFullYear(), v = 0;
                o3 && !s2 || (v = s2 > 0 ? s2 - 1 : M2.getMonth());
                var D, w = f3 || 0, g = h3 || 0, y = u3 || 0, L = d3 || 0;
                return c3 ? new Date(Date.UTC(p, v, Y, w, g, y, L + 60 * c3.offset * 1e3)) : n3 ? new Date(Date.UTC(p, v, Y, w, g, y, L)) : (D = new Date(p, v, Y, w, g, y, L), m2 && (D = r4(D).week(m2).toDate()), D);
              } catch (e5) {
                return /* @__PURE__ */ new Date("");
              }
            })(t3, a2, r3, n2), this.init(), d2 && true !== d2 && (this.$L = this.locale(d2).$L), u2 && t3 != this.format(a2) && (this.$d = /* @__PURE__ */ new Date("")), s = {};
          } else if (a2 instanceof Array) for (var c2 = a2.length, m = 1; m <= c2; m += 1) {
            o2[1] = a2[m - 1];
            var M = n2.apply(this, o2);
            if (M.isValid()) {
              this.$d = M.$d, this.$L = M.$L, this.init();
              break;
            }
            m === c2 && (this.$d = /* @__PURE__ */ new Date(""));
          }
          else i2.call(this, e3);
        };
      };
    }));
  })(customParseFormat$2);
  return customParseFormat$2.exports;
}
var customParseFormatExports = requireCustomParseFormat();
const customParseFormat = /* @__PURE__ */ getDefaultExportFromCjs(customParseFormatExports);
dayjs.extend(customParseFormat);
class Rule {
  _required = false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _rules = [];
  _level = "error";
  _message;
  static FIELD_REF = Symbol("fieldReference");
  static valueOfField(path) {
    return {
      __fieldReference: true,
      path
    };
  }
  valueOfField(path) {
    return Rule.valueOfField(path);
  }
  required() {
    const newRule = this.clone();
    newRule._required = true;
    return newRule;
  }
  optional() {
    const newRule = this.clone();
    newRule._required = false;
    return newRule;
  }
  min(len) {
    const newRule = this.clone();
    newRule._rules.push({ type: "min", constraint: len });
    return newRule;
  }
  max(len) {
    const newRule = this.clone();
    newRule._rules.push({ type: "max", constraint: len });
    return newRule;
  }
  length(len) {
    const newRule = this.clone();
    newRule._rules.push({ type: "length", constraint: len });
    return newRule;
  }
  unique() {
    const newRule = this.clone();
    newRule._rules.push({ type: "unique" });
    return newRule;
  }
  email() {
    const newRule = this.clone();
    newRule._rules.push({ type: "email" });
    return newRule;
  }
  uri(options) {
    const newRule = this.clone();
    newRule._rules.push({ type: "uri", constraint: options });
    return newRule;
  }
  regex(pattern, name) {
    const newRule = this.clone();
    newRule._rules.push({ type: "regex", constraint: { pattern, name } });
    return newRule;
  }
  positive() {
    const newRule = this.clone();
    newRule._rules.push({ type: "positive" });
    return newRule;
  }
  negative() {
    const newRule = this.clone();
    newRule._rules.push({ type: "negative" });
    return newRule;
  }
  integer() {
    const newRule = this.clone();
    newRule._rules.push({ type: "integer" });
    return newRule;
  }
  greaterThan(num) {
    const newRule = this.clone();
    newRule._rules.push({ type: "greaterThan", constraint: num });
    return newRule;
  }
  lessThan(num) {
    const newRule = this.clone();
    newRule._rules.push({ type: "lessThan", constraint: num });
    return newRule;
  }
  date(format) {
    const newRule = this.clone();
    newRule._rules.push({ type: "date", constraint: format || "YYYY-MM-DD" });
    return newRule;
  }
  datetime(dateFormat, timeFormat) {
    const newRule = this.clone();
    const fullFormat = `${dateFormat || "YYYY-MM-DD"} ${timeFormat || "HH:mm"}`;
    newRule._rules.push({ type: "datetime", constraint: fullFormat });
    return newRule;
  }
  custom(fn) {
    const newRule = this.clone();
    newRule._rules.push({ type: "custom", constraint: fn });
    return newRule;
  }
  error(message) {
    const newRule = this.clone();
    newRule._level = "error";
    newRule._message = message;
    return newRule;
  }
  warning(message) {
    const newRule = this.clone();
    newRule._level = "warning";
    newRule._message = message;
    return newRule;
  }
  info(message) {
    const newRule = this.clone();
    newRule._level = "info";
    newRule._message = message;
    return newRule;
  }
  clone() {
    const newRule = new Rule();
    newRule._required = this._required;
    newRule._rules = [...this._rules];
    newRule._level = this._level;
    newRule._message = this._message;
    return newRule;
  }
  async validate(value, context = {}) {
    const markers = [];
    if (this._required && (value === void 0 || value === null || value === "")) {
      markers.push({
        level: this._level,
        message: this._message || "Required",
        path: context.path
      });
    }
    if (!this._required && (value === void 0 || value === null || value === "")) {
      return markers;
    }
    for (const rule of this._rules) {
      try {
        const result = await this.validateRule(rule, value, context);
        if (result) {
          markers.push({
            level: this._level,
            message: this._message || result,
            path: context.path
          });
        }
      } catch (error) {
        markers.push({
          level: "error",
          message: `Validation error: ${error instanceof Error ? error.message : "Unknown error"}`,
          path: context.path
        });
      }
    }
    return markers;
  }
  async validateRule(rule, value, context) {
    switch (rule.type) {
      case "min":
        if (typeof value === "string" && value.length < rule.constraint) {
          return `Must be at least ${rule.constraint} characters`;
        }
        if (typeof value === "number" && value < rule.constraint) {
          return `Must be at least ${rule.constraint}`;
        }
        if (Array.isArray(value) && value.length < rule.constraint) {
          return `Must have at least ${rule.constraint} item${rule.constraint === 1 ? "" : "s"}`;
        }
        break;
      case "max":
        if (typeof value === "string" && value.length > rule.constraint) {
          return `Must be at most ${rule.constraint} characters`;
        }
        if (typeof value === "number" && value > rule.constraint) {
          return `Must be at most ${rule.constraint}`;
        }
        if (Array.isArray(value) && value.length > rule.constraint) {
          return `Must have at most ${rule.constraint} item${rule.constraint === 1 ? "" : "s"}`;
        }
        break;
      case "length":
        if (Array.isArray(value) && value.length !== rule.constraint) {
          return `Must have exactly ${rule.constraint} item${rule.constraint === 1 ? "" : "s"}`;
        }
        if (typeof value === "string" && value.length !== rule.constraint) {
          return `Must be exactly ${rule.constraint} characters`;
        }
        break;
      case "unique":
        if (Array.isArray(value)) {
          const seen = /* @__PURE__ */ new Set();
          for (const item of value) {
            const normalized = this.normalizeForComparison(item);
            const serialized = JSON.stringify(normalized);
            if (seen.has(serialized)) {
              return "All items must be unique";
            }
            seen.add(serialized);
          }
        }
        break;
      case "email":
        if (typeof value === "string" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return "Must be a valid email address";
        }
        break;
      case "uri":
        if (typeof value === "string") {
          const opts = rule.constraint || {};
          const schemes = opts.scheme || [/^https?$/];
          const allowRelative = opts.allowRelative || false;
          const relativeOnly = opts.relativeOnly || false;
          const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(value);
          const isProtocolRelative = value.startsWith("//");
          if (relativeOnly) {
            if (hasScheme || isProtocolRelative) {
              return "Must be a relative URL";
            }
            if (!value.startsWith("/") && !value.startsWith(".") && !value.startsWith("#") && !value.startsWith("?")) {
              return "Must be a relative URL starting with /, ., #, or ?";
            }
          } else if (!hasScheme && !isProtocolRelative) {
            if (!allowRelative) {
              return "Must be an absolute URL";
            }
            if (!value.startsWith("/") && !value.startsWith(".") && !value.startsWith("#") && !value.startsWith("?")) {
              return "Must be a valid relative URL";
            }
          } else {
            try {
              const url = new URL(value);
              const urlScheme = url.protocol.slice(0, -1);
              const schemeMatches = schemes.some(
                (s) => s instanceof RegExp ? s.test(urlScheme) : s === urlScheme
              );
              if (!schemeMatches) {
                const schemeList = schemes.map((s) => s instanceof RegExp ? s.toString() : s).join(", ");
                return `URL scheme must be one of: ${schemeList}`;
              }
            } catch {
              return "Must be a valid URL";
            }
          }
        }
        break;
      case "regex":
        if (typeof value === "string" && !rule.constraint.pattern.test(value)) {
          return `Must match pattern${rule.constraint.name ? ` (${rule.constraint.name})` : ""}`;
        }
        break;
      case "positive":
        if (typeof value === "number" && value <= 0) {
          return "Must be positive";
        }
        break;
      case "negative":
        if (typeof value === "number" && value >= 0) {
          return "Must be negative";
        }
        break;
      case "integer":
        if (typeof value === "number" && !Number.isInteger(value)) {
          return "Must be an integer";
        }
        break;
      case "date": {
        if (typeof value === "string") {
          const format = rule.constraint || "YYYY-MM-DD";
          cmsLogger.debug("[Rule.validate] DATE validation", { value, format });
          const parsed = dayjs(value, format, true);
          cmsLogger.debug("[Rule.validate] DATE parsed", {
            isValid: parsed.isValid(),
            parsed: parsed.format()
          });
          if (!parsed.isValid()) {
            cmsLogger.debug("[Rule.validate] DATE validation FAILED - invalid format");
            return `Invalid date format. Expected: ${format}`;
          }
          if (parsed.format(format) !== value) {
            cmsLogger.debug("[Rule.validate] DATE validation FAILED - format mismatch", {
              expected: value,
              got: parsed.format(format)
            });
            return `Invalid date. Expected format: ${format}`;
          }
          cmsLogger.debug("[Rule.validate] DATE validation PASSED");
        }
        break;
      }
      case "datetime": {
        if (typeof value === "string") {
          const format = rule.constraint || "YYYY-MM-DD HH:mm";
          cmsLogger.debug("[Rule.validate] DATETIME validation", { value, format });
          const parsed = dayjs(value, format, true);
          cmsLogger.debug("[Rule.validate] DATETIME parsed", {
            isValid: parsed.isValid(),
            parsed: parsed.format()
          });
          if (!parsed.isValid()) {
            cmsLogger.debug("[Rule.validate] DATETIME validation FAILED - invalid format");
            return `Invalid datetime format. Expected: ${format}`;
          }
          if (parsed.format(format) !== value) {
            cmsLogger.debug("[Rule.validate] DATETIME validation FAILED - format mismatch", {
              expected: value,
              got: parsed.format(format)
            });
            return `Invalid datetime. Expected format: ${format}`;
          }
          cmsLogger.debug("[Rule.validate] DATETIME validation PASSED");
        }
        break;
      }
      case "custom": {
        const customResult = await rule.constraint(value, context);
        if (customResult === false) {
          return "Validation failed";
        }
        if (typeof customResult === "string") {
          return customResult;
        }
        if (Array.isArray(customResult) && customResult.length > 0) {
          return customResult[0].message;
        }
        break;
      }
    }
    return null;
  }
  isRequired() {
    return this._required;
  }
  // Helper method to normalize objects for comparison (exclude _key)
  normalizeForComparison(value) {
    if (value === null || value === void 0) {
      return value;
    }
    if (Array.isArray(value)) {
      return value.map((item) => this.normalizeForComparison(item));
    }
    if (typeof value === "object") {
      const normalized = {};
      for (const [key, val] of Object.entries(value)) {
        if (key !== "_key") {
          normalized[key] = this.normalizeForComparison(val);
        }
      }
      return normalized;
    }
    return value;
  }
}
var utc$2 = { exports: {} };
var utc$1 = utc$2.exports;
var hasRequiredUtc;
function requireUtc() {
  if (hasRequiredUtc) return utc$2.exports;
  hasRequiredUtc = 1;
  (function(module, exports) {
    !(function(t, i) {
      module.exports = i();
    })(utc$1, (function() {
      var t = "minute", i = /[+-]\d\d(?::?\d\d)?/g, e = /([+-]|\d\d)/g;
      return function(s, f, n) {
        var u = f.prototype;
        n.utc = function(t2) {
          var i2 = { date: t2, utc: true, args: arguments };
          return new f(i2);
        }, u.utc = function(i2) {
          var e2 = n(this.toDate(), { locale: this.$L, utc: true });
          return i2 ? e2.add(this.utcOffset(), t) : e2;
        }, u.local = function() {
          return n(this.toDate(), { locale: this.$L, utc: false });
        };
        var r = u.parse;
        u.parse = function(t2) {
          t2.utc && (this.$u = true), this.$utils().u(t2.$offset) || (this.$offset = t2.$offset), r.call(this, t2);
        };
        var o = u.init;
        u.init = function() {
          if (this.$u) {
            var t2 = this.$d;
            this.$y = t2.getUTCFullYear(), this.$M = t2.getUTCMonth(), this.$D = t2.getUTCDate(), this.$W = t2.getUTCDay(), this.$H = t2.getUTCHours(), this.$m = t2.getUTCMinutes(), this.$s = t2.getUTCSeconds(), this.$ms = t2.getUTCMilliseconds();
          } else o.call(this);
        };
        var a = u.utcOffset;
        u.utcOffset = function(s2, f2) {
          var n2 = this.$utils().u;
          if (n2(s2)) return this.$u ? 0 : n2(this.$offset) ? a.call(this) : this.$offset;
          if ("string" == typeof s2 && (s2 = (function(t2) {
            void 0 === t2 && (t2 = "");
            var s3 = t2.match(i);
            if (!s3) return null;
            var f3 = ("" + s3[0]).match(e) || ["-", 0, 0], n3 = f3[0], u3 = 60 * +f3[1] + +f3[2];
            return 0 === u3 ? 0 : "+" === n3 ? u3 : -u3;
          })(s2), null === s2)) return this;
          var u2 = Math.abs(s2) <= 16 ? 60 * s2 : s2;
          if (0 === u2) return this.utc(f2);
          var r2 = this.clone();
          if (f2) return r2.$offset = u2, r2.$u = false, r2;
          var o2 = this.$u ? this.toDate().getTimezoneOffset() : -1 * this.utcOffset();
          return (r2 = this.local().add(u2 + o2, t)).$offset = u2, r2.$x.$localOffset = o2, r2;
        };
        var h = u.format;
        u.format = function(t2) {
          var i2 = t2 || (this.$u ? "YYYY-MM-DDTHH:mm:ss[Z]" : "");
          return h.call(this, i2);
        }, u.valueOf = function() {
          var t2 = this.$utils().u(this.$offset) ? 0 : this.$offset + (this.$x.$localOffset || this.$d.getTimezoneOffset());
          return this.$d.valueOf() - 6e4 * t2;
        }, u.isUTC = function() {
          return !!this.$u;
        }, u.toISOString = function() {
          return this.toDate().toISOString();
        }, u.toString = function() {
          return this.toDate().toUTCString();
        };
        var l = u.toDate;
        u.toDate = function(t2) {
          return "s" === t2 && this.$offset ? n(this.format("YYYY-MM-DD HH:mm:ss:SSS")).toDate() : l.call(this);
        };
        var c = u.diff;
        u.diff = function(t2, i2, e2) {
          if (t2 && this.$u === t2.$u) return c.call(this, t2, i2, e2);
          var s2 = this.local(), f2 = n(t2).local();
          return c.call(s2, f2, i2, e2);
        };
      };
    }));
  })(utc$2);
  return utc$2.exports;
}
var utcExports = requireUtc();
const utc = /* @__PURE__ */ getDefaultExportFromCjs(utcExports);
dayjs.extend(customParseFormat);
dayjs.extend(utc);
function convertDateToUserFormat(value, userFormat) {
  const parsedISO = dayjs(value, "YYYY-MM-DD", true);
  if (parsedISO.isValid()) {
    return parsedISO.format(userFormat);
  }
  const parsedUser = dayjs(value, userFormat, true);
  if (parsedUser.isValid()) {
    return value;
  }
  return value;
}
function convertDateToISO(value, userFormat) {
  const parsedUser = dayjs(value, userFormat, true);
  if (parsedUser.isValid()) {
    return parsedUser.format("YYYY-MM-DD");
  }
  const parsedISO = dayjs(value, "YYYY-MM-DD", true);
  if (parsedISO.isValid()) {
    return value;
  }
  return value;
}
function convertDateTimeToUserFormat(value, dateFormat, timeFormat = "HH:mm") {
  const userFormat = `${dateFormat} ${timeFormat}`;
  const parsedISO = dayjs(value, "YYYY-MM-DDTHH:mm:ss[Z]", true);
  if (parsedISO.isValid()) {
    return parsedISO.format(userFormat);
  }
  const parsedUser = dayjs(value, userFormat, true);
  if (parsedUser.isValid()) {
    return value;
  }
  return value;
}
function convertDateTimeToISO(value, dateFormat, timeFormat = "HH:mm") {
  const userFormat = `${dateFormat} ${timeFormat}`;
  cmsLogger.debug("[convertDateTimeToISO]", { value, userFormat });
  const parsedUser = dayjs(value, userFormat, true);
  if (parsedUser.isValid()) {
    const result = parsedUser.utc().format("YYYY-MM-DDTHH:mm:ss[Z]");
    cmsLogger.debug(
      "[convertDateTimeToISO] User format parse successful, converting to UTC:",
      result
    );
    return result;
  }
  const parsedISO = dayjs(value, "YYYY-MM-DDTHH:mm:ss[Z]", true);
  if (parsedISO.isValid()) {
    const result = parsedISO.utc().format("YYYY-MM-DDTHH:mm:ss[Z]");
    cmsLogger.debug("[convertDateTimeToISO] ISO parse successful:", result);
    return result;
  }
  cmsLogger.debug("[convertDateTimeToISO] Invalid - returning as-is");
  return value;
}
function normalizeDateFields(data, schema) {
  const normalizedData = { ...data };
  const dataForValidation = { ...data };
  cmsLogger.debug("[normalizeDateFields] Starting normalization...");
  cmsLogger.debug("[normalizeDateFields] Input data:", data);
  for (const field of schema.fields) {
    if (field.type === "date" && normalizedData[field.name]) {
      const dateField = field;
      const userFormat = dateField.options?.dateFormat || "YYYY-MM-DD";
      const dateValue = normalizedData[field.name];
      cmsLogger.debug(`[normalizeDateFields] Processing DATE field "${field.name}"`, {
        originalValue: dateValue,
        userFormat
      });
      if (typeof dateValue === "string") {
        normalizedData[field.name] = convertDateToISO(dateValue, userFormat);
        dataForValidation[field.name] = convertDateToUserFormat(dateValue, userFormat);
        cmsLogger.debug(`[normalizeDateFields] Converted DATE field "${field.name}"`, {
          normalizedValue: normalizedData[field.name],
          validationValue: dataForValidation[field.name]
        });
      }
    } else if (field.type === "datetime" && normalizedData[field.name]) {
      const dateTimeField = field;
      const dateFormat = dateTimeField.options?.dateFormat || "YYYY-MM-DD";
      const timeFormat = dateTimeField.options?.timeFormat || "HH:mm";
      const dateTimeValue = normalizedData[field.name];
      cmsLogger.debug(`[normalizeDateFields] Processing DATETIME field "${field.name}"`, {
        originalValue: dateTimeValue,
        dateFormat,
        timeFormat,
        combinedFormat: `${dateFormat} ${timeFormat}`
      });
      if (typeof dateTimeValue === "string") {
        normalizedData[field.name] = convertDateTimeToISO(dateTimeValue, dateFormat, timeFormat);
        dataForValidation[field.name] = convertDateTimeToUserFormat(
          dateTimeValue,
          dateFormat,
          timeFormat
        );
        cmsLogger.debug(`[normalizeDateFields] Converted DATETIME field "${field.name}"`, {
          normalizedValue: normalizedData[field.name],
          validationValue: dataForValidation[field.name]
        });
      }
    }
  }
  cmsLogger.debug("[normalizeDateFields] Final result:", {
    normalizedData,
    dataForValidation
  });
  return { normalizedData, dataForValidation };
}

export { Rule as R, dayjs as d, normalizeDateFields as n, utc as u };
//# sourceMappingURL=date-utils-xyIWAIQq.js.map
