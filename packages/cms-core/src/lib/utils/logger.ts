const EXECLUDE = [
          'validateField',
          'SchemaField.performValidation',
          'Layout Calc'
];

export function cmsLogger(...args: any[]) {
          if (args.length > 0 && typeof args[0] === 'string') {
                    const title = args[0].toString().replace(/\[|\]/g, '');
                    if (EXECLUDE.includes(title)) return;
                    console.log(...args);
          }
}