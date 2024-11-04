import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { createGqlResponseSchema, gqlResponseSchema } from './schemas.js';
import {
  graphql,
  GraphQLEnumType,
  GraphQLInputObjectType,
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

  const CreateUserInput = new GraphQLInputObjectType({
    name: 'CreateUserInput',
    fields: {
      name: { type: new GraphQLNonNull(GraphQLString) },
      balance: { type: new GraphQLNonNull(GraphQLString) },
    },
  });

  const CreateProfileInput = new GraphQLInputObjectType({
    name: 'CreateProfileInput',
    fields: {
      isMale: { type: new GraphQLNonNull(GraphQLString) },
      yearOfBirth: { type: GraphQLString },
      userId: { type: new GraphQLNonNull(UUIDType) },
      memberTypeId: { type: new GraphQLNonNull(MemberTypeId) },
    },
  });

  const Mutations = new GraphQLObjectType({
    name: 'Mutations',
    fields: {
      createUser: {
        type: UserType,
        args: { dto: { type: new GraphQLNonNull(CreateUserInput) } },
        resolve: async (_, { dto }) => {
          const user = await prisma.user.create({ data: dto });
          return user;
        },
      },
      deleteUser: {
        type: GraphQLString,
        args: { id: { type: new GraphQLNonNull(UUIDType) } },
        resolve: async (_, { id }: { id: string }) => {
          await prisma.user.delete({ where: { id } });
          return `User with id ${id} deleted successfully.`;
        },
      },
      createProfile: {
        type: ProfileType,
        args: { dto: { type: new GraphQLNonNull(CreateProfileInput) } },
        resolve: async (_, { dto }) => {
          const profile = await prisma.profile.create({ data: dto });
          return profile;
        },
      },

      subscribeTo: {
        type: GraphQLString,
        args: {
          userId: { type: new GraphQLNonNull(UUIDType) },
          authorId: { type: new GraphQLNonNull(UUIDType) },
        },
        resolve: async (_, { userId, authorId }) => {
          // Logic to handle subscription
          return `Subscribed to user ${authorId}`;
        },
      },
      unsubscribeFrom: {
        type: GraphQLString,
        args: {
          userId: { type: new GraphQLNonNull(UUIDType) },
          authorId: { type: new GraphQLNonNull(UUIDType) },
        },
        resolve: async (_, { userId, authorId }) => {
          // Logic to handle unsubscription
          return `Unsubscribed from user ${authorId}`;
        },
      },
    },
  });

  const schema = new GraphQLSchema({
    query: RootQueryType,
    mutation: Mutations,
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
        variableValues: req.body.variables,
      });
    },
  });
};

export default plugin;
