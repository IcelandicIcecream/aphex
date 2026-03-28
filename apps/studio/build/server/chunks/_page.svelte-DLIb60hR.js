import { i as head } from './index5-DltsKoco.js';
import { p as page } from './index6-DBfMzOzG.js';
import { g as goto } from './client-BGGljB7r.js';
import { B as Button } from './button-1bYQaKO-.js';
import { B as Badge } from './badge-DEuvdmY7.js';
import { C as Card, a as Card_header, c as Card_title, b as Card_content } from './card-title-DpOlyEWh.js';
import { C as Card_description } from './card-description-B4j6Vmwc.js';
import { e as escape_html } from './context-CAhUmS6w.js';
import './exports-Ci9YzwMm.js';
import './utils2-CVx6kO_W.js';

function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { data } = $$props;
    page.params.token;
    head("12nwbd8", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Aphex CMS - Invitation</title>`);
      });
    });
    $$renderer2.push(`<div class="bg-muted/40 flex min-h-screen items-center justify-center px-4 py-12"><div class="w-full max-w-md"><!---->`);
    Card($$renderer2, {
      class: "shadow-lg",
      children: ($$renderer3) => {
        if (data.error === "invalid") {
          $$renderer3.push("<!--[-->");
          $$renderer3.push(`<!---->`);
          Card_header($$renderer3, {
            class: "space-y-1",
            children: ($$renderer4) => {
              $$renderer4.push(`<!---->`);
              Card_title($$renderer4, {
                class: "text-center text-2xl font-bold",
                children: ($$renderer5) => {
                  $$renderer5.push(`<!---->Invalid Invitation`);
                },
                $$slots: { default: true }
              });
              $$renderer4.push(`<!---->`);
            },
            $$slots: { default: true }
          });
          $$renderer3.push(`<!----> <!---->`);
          Card_content($$renderer3, {
            children: ($$renderer4) => {
              $$renderer4.push(`<p class="text-muted-foreground text-center">This invitation link is invalid or has been revoked.</p> `);
              Button($$renderer4, {
                class: "mt-6 w-full",
                onclick: () => goto(),
                children: ($$renderer5) => {
                  $$renderer5.push(`<!---->Go to Sign In`);
                },
                $$slots: { default: true }
              });
              $$renderer4.push(`<!---->`);
            },
            $$slots: { default: true }
          });
          $$renderer3.push(`<!---->`);
        } else {
          $$renderer3.push("<!--[!-->");
          if (data.error === "expired") {
            $$renderer3.push("<!--[-->");
            $$renderer3.push(`<!---->`);
            Card_header($$renderer3, {
              class: "space-y-1",
              children: ($$renderer4) => {
                $$renderer4.push(`<!---->`);
                Card_title($$renderer4, {
                  class: "text-center text-2xl font-bold",
                  children: ($$renderer5) => {
                    $$renderer5.push(`<!---->Invitation Expired`);
                  },
                  $$slots: { default: true }
                });
                $$renderer4.push(`<!---->`);
              },
              $$slots: { default: true }
            });
            $$renderer3.push(`<!----> <!---->`);
            Card_content($$renderer3, {
              children: ($$renderer4) => {
                $$renderer4.push(`<p class="text-muted-foreground text-center">This invitation has expired. Please ask the organization admin to send a new one.</p> `);
                Button($$renderer4, {
                  class: "mt-6 w-full",
                  onclick: () => goto(),
                  children: ($$renderer5) => {
                    $$renderer5.push(`<!---->Go to Sign In`);
                  },
                  $$slots: { default: true }
                });
                $$renderer4.push(`<!---->`);
              },
              $$slots: { default: true }
            });
            $$renderer3.push(`<!---->`);
          } else {
            $$renderer3.push("<!--[!-->");
            if (data.error === "already_accepted") {
              $$renderer3.push("<!--[-->");
              $$renderer3.push(`<!---->`);
              Card_header($$renderer3, {
                class: "space-y-1",
                children: ($$renderer4) => {
                  $$renderer4.push(`<!---->`);
                  Card_title($$renderer4, {
                    class: "text-center text-2xl font-bold",
                    children: ($$renderer5) => {
                      $$renderer5.push(`<!---->Already Accepted`);
                    },
                    $$slots: { default: true }
                  });
                  $$renderer4.push(`<!---->`);
                },
                $$slots: { default: true }
              });
              $$renderer3.push(`<!----> <!---->`);
              Card_content($$renderer3, {
                children: ($$renderer4) => {
                  $$renderer4.push(`<p class="text-muted-foreground text-center">This invitation has already been accepted.</p> `);
                  Button($$renderer4, {
                    class: "mt-6 w-full",
                    onclick: () => goto(),
                    children: ($$renderer5) => {
                      $$renderer5.push(`<!---->Go to Dashboard`);
                    },
                    $$slots: { default: true }
                  });
                  $$renderer4.push(`<!---->`);
                },
                $$slots: { default: true }
              });
              $$renderer3.push(`<!---->`);
            } else {
              $$renderer3.push("<!--[!-->");
              if (data.error === "email_mismatch") {
                $$renderer3.push("<!--[-->");
                $$renderer3.push(`<!---->`);
                Card_header($$renderer3, {
                  class: "space-y-1",
                  children: ($$renderer4) => {
                    $$renderer4.push(`<!---->`);
                    Card_title($$renderer4, {
                      class: "text-center text-2xl font-bold",
                      children: ($$renderer5) => {
                        $$renderer5.push(`<!---->Wrong Account`);
                      },
                      $$slots: { default: true }
                    });
                    $$renderer4.push(`<!---->`);
                  },
                  $$slots: { default: true }
                });
                $$renderer3.push(`<!----> <!---->`);
                Card_content($$renderer3, {
                  children: ($$renderer4) => {
                    $$renderer4.push(`<p class="text-muted-foreground text-center">This invitation was sent to <strong>${escape_html(data.invitation?.email)}</strong>. Please sign in
						with that email address to accept it.</p> `);
                    Button($$renderer4, {
                      class: "mt-6 w-full",
                      onclick: () => goto(),
                      children: ($$renderer5) => {
                        $$renderer5.push(`<!---->Sign In with Different Account`);
                      },
                      $$slots: { default: true }
                    });
                    $$renderer4.push(`<!---->`);
                  },
                  $$slots: { default: true }
                });
                $$renderer3.push(`<!---->`);
              } else {
                $$renderer3.push("<!--[!-->");
                $$renderer3.push(`<!---->`);
                Card_header($$renderer3, {
                  class: "space-y-1",
                  children: ($$renderer4) => {
                    $$renderer4.push(`<!---->`);
                    Card_title($$renderer4, {
                      class: "text-center text-2xl font-bold",
                      children: ($$renderer5) => {
                        $$renderer5.push(`<!---->You're Invited`);
                      },
                      $$slots: { default: true }
                    });
                    $$renderer4.push(`<!----> <!---->`);
                    Card_description($$renderer4, {
                      class: "text-center",
                      children: ($$renderer5) => {
                        $$renderer5.push(`<!---->Sign in to accept this invitation`);
                      },
                      $$slots: { default: true }
                    });
                    $$renderer4.push(`<!---->`);
                  },
                  $$slots: { default: true }
                });
                $$renderer3.push(`<!----> <!---->`);
                Card_content($$renderer3, {
                  children: ($$renderer4) => {
                    $$renderer4.push(`<div class="space-y-4"><div class="bg-muted/50 rounded-lg p-4 text-center">`);
                    if (data.organization) {
                      $$renderer4.push("<!--[-->");
                      $$renderer4.push(`<p class="text-lg font-semibold">${escape_html(data.organization.name)}</p> <p class="text-muted-foreground text-sm">/${escape_html(data.organization.slug)}</p>`);
                    } else {
                      $$renderer4.push("<!--[!-->");
                    }
                    $$renderer4.push(`<!--]--> `);
                    if (data.invitation) {
                      $$renderer4.push("<!--[-->");
                      Badge($$renderer4, {
                        variant: "outline",
                        class: "mt-2 capitalize",
                        children: ($$renderer5) => {
                          $$renderer5.push(`<!---->${escape_html(data.invitation.role)}`);
                        },
                        $$slots: { default: true }
                      });
                    } else {
                      $$renderer4.push("<!--[!-->");
                    }
                    $$renderer4.push(`<!--]--></div> <p class="text-muted-foreground text-center text-sm">Sign in or create an account to join this organization.</p> `);
                    Button($$renderer4, {
                      class: "w-full",
                      onclick: () => goto(),
                      children: ($$renderer5) => {
                        $$renderer5.push(`<!---->Sign In to Accept`);
                      },
                      $$slots: { default: true }
                    });
                    $$renderer4.push(`<!----></div>`);
                  },
                  $$slots: { default: true }
                });
                $$renderer3.push(`<!---->`);
              }
              $$renderer3.push(`<!--]-->`);
            }
            $$renderer3.push(`<!--]-->`);
          }
          $$renderer3.push(`<!--]-->`);
        }
        $$renderer3.push(`<!--]-->`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> <p class="text-muted-foreground mt-6 text-center text-xs">Aphex CMS - Built with SvelteKit</p></div></div>`);
  });
}

export { _page as default };
//# sourceMappingURL=_page.svelte-DLIb60hR.js.map
