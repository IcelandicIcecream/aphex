import { buildSchema } from 'graphql';
import type { SchemaType, Field, ArrayField, ObjectField, ReferenceField } from '../cms/types.js';

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function generateGraphQLField(field: Field, schemaTypes: SchemaType[], parentName = ''): string {
  const nullability = isFieldRequired(field) ? '!' : '';
  const fieldType = getGraphQLType(field, schemaTypes, parentName);
  return `  ${field.name}: ${fieldType}${nullability}`;
}

function getGraphQLType(field: Field, schemaTypes: SchemaType[], parentName = ''): string {
  switch (field.type) {
    case 'string':
    case 'text':
    case 'slug':
      return 'String';
    case 'number':
      return 'Float';
    case 'boolean':
      return 'Boolean';
    case 'image':
      return 'String'; // URL for MVP
    case 'array':
      return handleArrayField(field as ArrayField, schemaTypes, parentName);
    case 'object':
      return handleObjectField(field as ObjectField, schemaTypes, parentName);
    case 'reference':
      return handleReferenceField(field as ReferenceField);
    default:
      return 'String';
  }
}

function handleArrayField(field: ArrayField, schemaTypes: SchemaType[], parentName = ''): string {
  if (!field.of || field.of.length === 0) {
    return '[String]';
  }

  // Check if all referenced types exist in schemaTypes
  const validTypes = field.of.filter(item =>
    schemaTypes.find(s => s.name === item.type)
  );

  if (validTypes.length === 0) {
    return '[String]'; // Fallback if no valid types found
  }

  // If array contains only one type
  if (validTypes.length === 1) {
    const itemType = validTypes[0];
    return `[${capitalizeFirst(itemType.type)}]`;
  }

  // For multiple types in array, create union type with parent prefix
  const unionName = `${capitalizeFirst(parentName)}${capitalizeFirst(field.name)}Item`;
  return `[${unionName}]`;
}

function handleObjectField(field: ObjectField, schemaTypes: SchemaType[], parentName = ''): string {
  if (field.fields && field.fields.length > 0) {
    // Inline object - create a unique type name with parent prefix
    return capitalizeFirst(`${parentName}${field.name}Object`);
  }
  return 'String'; // JSON string fallback
}

function handleReferenceField(field: ReferenceField): string {
  if (field.to && field.to.length === 1) {
    return capitalizeFirst(field.to[0].type);
  }
  return 'String'; // ID reference for MVP
}

function isFieldRequired(field: Field): boolean {
  if (!field.validation) return false;
  // Simple check - in production you'd parse the validation rules properly
  return field.validation.toString().includes('required');
}

function generateObjectType(schemaType: SchemaType, allSchemaTypes: SchemaType[]): string {
  const typeName = capitalizeFirst(schemaType.name);
  const fields = schemaType.fields
    .map(field => generateGraphQLField(field, allSchemaTypes, schemaType.name))
    .join('\n');

  return `type ${typeName} {
${fields}
}`;
}

function generateDocumentType(schemaType: SchemaType, allSchemaTypes: SchemaType[]): string {
  const typeName = capitalizeFirst(schemaType.name);
  const customFields = schemaType.fields
    .map(field => generateGraphQLField(field, allSchemaTypes, schemaType.name))
    .join('\n');

  return `type ${typeName} {
  id: ID!
  type: String!
  status: String!
  createdAt: String!
  updatedAt: String!
  publishedAt: String
${customFields}
}`;
}

function generateInlineObjectTypes(schemaTypes: SchemaType[]): string {
  const inlineTypes: string[] = [];

  function processFields(fields: Field[], parentName: string): void {
    fields.forEach(field => {
      if (field.type === 'object' && (field as ObjectField).fields) {
        const objectField = field as ObjectField;
        const typeName = capitalizeFirst(`${parentName}${field.name}Object`);
        const fieldDefs = objectField.fields
          .map(f => generateGraphQLField(f, schemaTypes, `${parentName}${field.name}`))
          .join('\n');

        inlineTypes.push(`type ${typeName} {
${fieldDefs}
}`);

        // Recursively process nested objects
        processFields(objectField.fields, `${parentName}${field.name}`);
      }

      if (field.type === 'array') {
        const arrayField = field as ArrayField;
        if (arrayField.of && arrayField.of.length > 1) {
          // Only create union for types that exist in schemaTypes
          const validTypes = arrayField.of.filter(item =>
            schemaTypes.find(s => s.name === item.type)
          );

          if (validTypes.length > 1) {
            const unionName = `${capitalizeFirst(parentName)}${capitalizeFirst(field.name)}Item`;
            const unionTypes = validTypes
              .map(item => capitalizeFirst(item.type))
              .join(' | ');

            inlineTypes.push(`union ${unionName} = ${unionTypes}`);
          }
        }
      }
    });
  }

  schemaTypes.forEach(schemaType => {
    processFields(schemaType.fields, schemaType.name);
  });

  return inlineTypes.join('\n\n');
}

function generateQueryFields(schemaTypes: SchemaType[]): string {
  const documentTypes = schemaTypes.filter(type => type.type === 'document');

  return documentTypes.map(schemaType => {
    const typeName = capitalizeFirst(schemaType.name);
    return `  ${schemaType.name}(id: ID!, perspective: String): ${typeName}
  all${typeName}(perspective: String, status: String): [${typeName}]`;
  }).join('\n');
}

export function generateGraphQLSchema(schemaTypes: SchemaType[]): string {
  const documentTypes = schemaTypes.filter(type => type.type === 'document');
  const objectTypes = schemaTypes.filter(type => type.type === 'object');

  const documentTypeDefs = documentTypes
    .map(schema => generateDocumentType(schema, schemaTypes))
    .join('\n\n');

  const objectTypeDefs = objectTypes
    .map(schema => generateObjectType(schema, schemaTypes))
    .join('\n\n');

  const inlineTypeDefs = generateInlineObjectTypes(schemaTypes);

  const queryFields = generateQueryFields(schemaTypes);

  const result = `
type Query {
${queryFields}
}

${documentTypeDefs}

${objectTypeDefs}

${inlineTypeDefs}
`.trim();

  return result;
}

export function createGraphQLSchema(schemaTypes: SchemaType[], resolvers?: any) {
  const typeDefs = generateGraphQLSchema(schemaTypes);
  const schema = buildSchema(typeDefs);

  // If resolvers are provided, we need to use a different approach
  // For now, return the basic schema - resolvers will be handled by Yoga
  return schema;
}