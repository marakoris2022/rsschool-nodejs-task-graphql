import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { createGqlResponseSchema, gqlResponseSchema } from './schemas.js';
import {
  graphql,
  GraphQLEnumType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLSchema,
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
      authorId: { type: new GraphQLNonNull(UUIDType) },
    }),
  });

  const ProfileType = new GraphQLObjectType({
    name: 'Profile',
    fields: () => ({
      id: { type: UUIDType },
      isMale: { type: new GraphQLNonNull(GraphQLString) },
      yearOfBirth: { type: GraphQLString },
      userId: { type: new GraphQLNonNull(UUIDType) },
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

  const RootQueryType = new GraphQLObjectType({
    name: 'RootQueryType',
    fields: () => ({
      memberTypes: {
        type: new GraphQLList(MemberTypeType),
        resolve: async () => {
          return await prisma.memberType.findMany();
        },
      },
      users: {
        type: new GraphQLList(UserType),
        resolve: async () => {
          return await prisma.user.findMany();
        },
      },
      posts: {
        type: new GraphQLList(PostType),
        resolve: async () => {
          return await prisma.post.findMany();
        },
      },
      profiles: {
        type: new GraphQLList(ProfileType),
        resolve: async () => {
          return await prisma.profile.findMany();
        },
      },
      memberType: {
        type: MemberTypeType,
        args: { id: { type: new GraphQLNonNull(MemberTypeId) } },
        resolve: async (_, { id }: { id: string }) => {
          // Fetch the member type by its ID
          return await prisma.memberType.findUnique({ where: { id } });
        },
      },
      user: {
        type: UserType,
        args: { id: { type: new GraphQLNonNull(UUIDType) } },
        resolve: async (_, { id }: { id: string }) => {
          return await prisma.user.findUnique({ where: { id } });
        },
      },
      post: {
        type: PostType,
        args: { id: { type: new GraphQLNonNull(UUIDType) } },
        resolve: async (_, { id }: { id: string }) => {
          return await prisma.post.findUnique({ where: { id } });
        },
      },
      profile: {
        type: ProfileType,
        args: { id: { type: new GraphQLNonNull(UUIDType) } },
        resolve: async (_, { id }: { id: string }) => {
          return await prisma.profile.findUnique({ where: { id } });
        },
      },
    }),
  });

  const schema = new GraphQLSchema({
    query: RootQueryType,
    // mutation: Mutations,
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
      return graphql({
        schema,
        source: req.body.query,
      });
    },
  });
};

export default plugin;
