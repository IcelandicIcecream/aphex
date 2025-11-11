import type {
	SchemaType,
	Field,
	ArrayField,
	ObjectField,
	ReferenceField
} from '@aphexcms/cms-core/server';

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
			return 'Image';
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
	const validTypes = field.of.filter((item) => schemaTypes.find((s) => s.name === item.type));

	if (validTypes.length === 0) {
		return '[String]'; // Fallback if no valid types found
	}

	// If array contains only one type
	if (validTypes.length === 1) {
		const itemType = validTypes[0]!;
		return `[${capitalizeFirst(itemType.type)}]`;
	}

	// For multiple types in array, create union type with parent prefix
	const unionName = `${capitalizeFirst(parentName)}${capitalizeFirst(field.name)}Item`;
	return `[${unionName}]`;
}

function handleObjectField(
	field: ObjectField,
	_schemaTypes: SchemaType[],
	parentName = ''
): string {
	if (field.fields && field.fields.length > 0) {
		// Inline object - create a unique type name with parent prefix
		return capitalizeFirst(`${parentName}${field.name}Object`);
	}
	return 'String'; // JSON string fallback
}

function handleReferenceField(field: ReferenceField): string {
	if (field.to && field.to.length === 1) {
		return capitalizeFirst(field.to[0]!.type);
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
		.map((field) => generateGraphQLField(field, allSchemaTypes, schemaType.name))
		.join('\n');

	return `type ${typeName} {
${fields}
}`;
}

function generateDocumentType(schemaType: SchemaType, allSchemaTypes: SchemaType[]): string {
	const typeName = capitalizeFirst(schemaType.name);
	const customFields = schemaType.fields
		.map((field) => generateGraphQLField(field, allSchemaTypes, schemaType.name))
		.join('\n');

	return `type ${typeName} {
  id: ID!
  type: String!
  status: String!
  createdAt: String
  updatedAt: String
  publishedAt: String
${customFields}
}`;
}

function generateInlineObjectTypes(schemaTypes: SchemaType[]): string {
	const inlineTypes: string[] = [];

	function processFields(fields: Field[], parentName: string): void {
		fields.forEach((field) => {
			if (field.type === 'object' && (field as ObjectField).fields) {
				const objectField = field as ObjectField;
				const typeName = capitalizeFirst(`${parentName}${field.name}Object`);
				const fieldDefs = objectField.fields
					.map((f) => generateGraphQLField(f, schemaTypes, `${parentName}${field.name}`))
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
					const validTypes = arrayField.of.filter((item) =>
						schemaTypes.find((s) => s.name === item.type)
					);

					if (validTypes.length > 1) {
						const unionName = `${capitalizeFirst(parentName)}${capitalizeFirst(field.name)}Item`;
						const unionTypes = validTypes.map((item) => capitalizeFirst(item.type)).join(' | ');

						inlineTypes.push(`union ${unionName} = ${unionTypes}`);
					}
				}
			}
		});
	}

	schemaTypes.forEach((schemaType) => {
		processFields(schemaType.fields, schemaType.name);
	});

	return inlineTypes.join('\n\n');
}

// Generate filter input types
function generateFilterInputTypes(): string {
	return `# Filter operators for string fields
input StringFilter {
  equals: String
  not_equals: String
  in: [String!]
  not_in: [String!]
  contains: String
  starts_with: String
  ends_with: String
  like: String
  exists: Boolean
}

# Filter operators for number fields
input NumberFilter {
  equals: Float
  not_equals: Float
  in: [Float!]
  not_in: [Float!]
  greater_than: Float
  greater_than_equal: Float
  less_than: Float
  less_than_equal: Float
  exists: Boolean
}

# Filter operators for boolean fields
input BooleanFilter {
  equals: Boolean
  not_equals: Boolean
  exists: Boolean
}

# Filter operators for ID fields
input IDFilter {
  equals: ID
  not_equals: ID
  in: [ID!]
  not_in: [ID!]
  exists: Boolean
}`;
}

// Generate where input type for a specific document type
function generateWhereInputType(schemaType: SchemaType, _allSchemaTypes: SchemaType[]): string {
	const typeName = capitalizeFirst(schemaType.name);
	const whereTypeName = `${typeName}WhereInput`;

	// Generate field filters
	const fieldFilters: string[] = [];

	schemaType.fields.forEach((field) => {
		const filterType = getFilterType(field);
		if (filterType) {
			fieldFilters.push(`  ${field.name}: ${filterType}`);
		}
	});

	// Add standard document fields
	fieldFilters.unshift(
		'  id: IDFilter',
		'  type: StringFilter',
		'  status: StringFilter',
		'  createdAt: StringFilter',
		'  updatedAt: StringFilter',
		'  publishedAt: StringFilter'
	);

	// Add logical operators
	fieldFilters.push(`  AND: [${whereTypeName}!]`, `  OR: [${whereTypeName}!]`);

	return `input ${whereTypeName} {
${fieldFilters.join('\n')}
}`;
}

function getFilterType(field: Field): string | null {
	switch (field.type) {
		case 'string':
		case 'text':
		case 'slug':
			return 'StringFilter';
		case 'number':
			return 'NumberFilter';
		case 'boolean':
			return 'BooleanFilter';
		case 'reference':
			return 'StringFilter'; // Reference IDs are strings
		// Arrays, objects, and images don't have direct filters in GraphQL
		default:
			return null;
	}
}

// Generate data input type for mutations
function generateDataInputType(schemaType: SchemaType, allSchemaTypes: SchemaType[]): string {
	const typeName = capitalizeFirst(schemaType.name);
	const inputTypeName = `${typeName}DataInput`;

	const fields: string[] = [];

	schemaType.fields.forEach((field) => {
		const inputFieldType = getInputFieldType(field, allSchemaTypes, schemaType.name);
		if (inputFieldType) {
			const required = isFieldRequired(field) ? '!' : '';
			fields.push(`  ${field.name}: ${inputFieldType}${required}`);
		}
	});

	return `input ${inputTypeName} {
${fields.join('\n')}
}`;
}

function getInputFieldType(
	field: Field,
	_schemaTypes: SchemaType[],
	_parentName: string
): string | null {
	switch (field.type) {
		case 'string':
		case 'text':
		case 'slug':
			return 'String';
		case 'number':
			return 'Float';
		case 'boolean':
			return 'Boolean';
		case 'reference':
			return 'String'; // Reference IDs
		case 'image':
			return 'JSON'; // Images are complex objects
		case 'array':
			// For arrays, we'll use JSON for simplicity
			// In a more advanced implementation, you'd create specific input types
			return '[JSON]';
		case 'object':
			// For objects, we'll use JSON for simplicity
			// In a more advanced implementation, you'd create specific input types
			return 'JSON';
		default:
			return 'JSON';
	}
}

function generateQueryFields(schemaTypes: SchemaType[]): string {
	const documentTypes = schemaTypes.filter((type) => type.type === 'document');

	return documentTypes
		.map((schemaType) => {
			const typeName = capitalizeFirst(schemaType.name);
			const whereInputType = `${typeName}WhereInput`;

			return `  # Get a single ${schemaType.name} by ID
  ${schemaType.name}(id: ID!, perspective: String, depth: Int): ${typeName}

  # Get all ${schemaType.name} documents with filtering
  all${typeName}(
    where: ${whereInputType}
    perspective: String
    limit: Int
    offset: Int
    sort: String
    depth: Int
  ): [${typeName}!]!`;
		})
		.join('\n\n');
}

function generateMutationFields(schemaTypes: SchemaType[]): string {
	const documentTypes = schemaTypes.filter((type) => type.type === 'document');

	return documentTypes
		.map((schemaType) => {
			const typeName = capitalizeFirst(schemaType.name);
			const dataInputType = `${typeName}DataInput`;

			return `  # Create a new ${schemaType.name}
  create${typeName}(data: ${dataInputType}!, publish: Boolean): ${typeName}!

  # Update an existing ${schemaType.name}
  update${typeName}(id: ID!, data: JSON!, publish: Boolean): ${typeName}!

  # Delete a ${schemaType.name}
  delete${typeName}(id: ID!): DeleteResult!

  # Publish a ${schemaType.name}
  publish${typeName}(id: ID!): ${typeName}!

  # Unpublish a ${schemaType.name}
  unpublish${typeName}(id: ID!): ${typeName}!`;
		})
		.join('\n\n');
}

export function generateGraphQLSchema(schemaTypes: SchemaType[]): string {
	const documentTypes = schemaTypes.filter((type) => type.type === 'document');
	const objectTypes = schemaTypes.filter((type) => type.type === 'object');

	const documentTypeDefs = documentTypes
		.map((schema) => generateDocumentType(schema, schemaTypes))
		.join('\n\n');

	const objectTypeDefs = objectTypes
		.map((schema) => generateObjectType(schema, schemaTypes))
		.join('\n\n');

	const inlineTypeDefs = generateInlineObjectTypes(schemaTypes);

	const filterInputTypes = generateFilterInputTypes();

	const whereInputTypes = documentTypes
		.map((schema) => generateWhereInputType(schema, schemaTypes))
		.join('\n\n');

	const dataInputTypes = documentTypes
		.map((schema) => generateDataInputType(schema, schemaTypes))
		.join('\n\n');

	const queryFields = generateQueryFields(schemaTypes);
	const mutationFields = generateMutationFields(schemaTypes);

	const imageTypeDef = `type Image {
  _type: String!
  asset: ImageAsset
  url: String
}

type ImageAsset {
  _ref: String!
  _type: String!
}`;

	const scalarDefs = `# JSON scalar for flexible data
scalar JSON`;

	const deleteResultType = `type DeleteResult {
  success: Boolean!
}`;

	const result = `
${scalarDefs}

type Query {
${queryFields}
}

type Mutation {
${mutationFields}
}

${deleteResultType}

${imageTypeDef}

${filterInputTypes}

${whereInputTypes}

${dataInputTypes}

${documentTypeDefs}

${objectTypeDefs}

${inlineTypeDefs}
`.trim();

	return result;
}
