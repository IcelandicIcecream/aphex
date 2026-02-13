const EXCLUDE: string[] = [
          // 'validateField',
          // 'SchemaField.performValidation',
          // 'Layout Calc',
          // // 'URL Effect',
          // 'Document Editor'
];

export function cmsLogger(...args: any[]) {
          if (args.length > 0 && typeof args[0] === 'string') {
                    const title = args[0].toString().replace(/\[|\]/g, '');
                    if (EXCLUDE.includes(title)) return;
                    console.log(...args);
          }
}