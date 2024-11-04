import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { createGqlResponseSchema, gqlResponseSchema } from './schemas.js';
import {
  graphql,
  GraphQLEnumType,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString,
} from 'graphql';
import { UUIDType } from './types/uuid.js';

const plugin: FastifyPluginAsyncTypebox = async (fastify) => {
  const { prisma } = fastify;

  const MemberTypeId = new GraphQLEnumType({
    name: 'MemberTypeId',
    values: {
      BASIC: { value: 'BASIC' },
      BUSINESS: { value: 'BUSINESS' },
    },
  });

  const MemberTypeType = new GraphQLObjectType({
    name: 'MemberType',
    fields: () => ({
      id: { type: MemberTypeId },
      discount: { type: GraphQLString },
      postsLimitPerMonth: { type: GraphQLString },
    }),
  });

  const PostType = new GraphQLObjectType({
    name: 'Post',
    fields: () => ({
      id: { type: UUIDType },
      title: { type: GraphQLString },
      content: { type: GraphQLString },
      authorId: { type: new GraphQLNonNull(UUIDType) }, // Добавлено поле authorId
    }),
  });

  const ProfileType = new GraphQLObjectType({
    name: 'Profile',
    fields: () => ({
      id: { type: UUIDType },
      isMale: { type: new GraphQLNonNull(GraphQLString) }, // Boolean
      yearOfBirth: { type: GraphQLString },
      userId: { type: new GraphQLNonNull(UUIDType) }, // Добавлено поле userId
      memberType: {
        type: MemberTypeType,
        resolve: async (profile) => {
          return await prisma.memberType.findUnique({
            where: { id: profile.memberTypeId },
          });
        },
      },
    }),
  });

  const UserType = new GraphQLObjectType({
    name: 'User',
    fields: () => ({
      id: { type: UUIDType },
      name: { type: GraphQLString },
      balance: { type: GraphQLString },
      profile: { type: ProfileType },
      posts: { type: new GraphQLList(PostType) },
      userSubscribedTo: { type: new GraphQLList(UserType) },
      subscribedToUser: { type: new GraphQLList(UserType) },
    }),
  });

  fastify.route({
    url: '/',
    method: 'POST',
    schema: {
      ...createGqlResponseSchema,
      response: {
        200: gqlResponseSchema,
      },
    },
    async handler(req) {
      // return graphql();
    },
  });
};

export default plugin;
