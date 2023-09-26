import {GraphQLError} from 'graphql';
import {locationInput} from '../../interfaces/Location';
import {UserIdWithToken} from '../../interfaces/User';
import rectangleBounds from '../../utils/rectangleBounds';
import catModel from '../models/catModel';
import {Types} from 'mongoose';
import {Cat, CatTest} from '../../interfaces/Cat';
import {Point} from 'geojson';
import userModel from '../models/userModel';

// TODO: create resolvers based on cat.graphql
// note: when updating or deleting a cat, you need to check if the user is the owner of the cat
// note2: when updating or deleting a cat as admin, you need to check if the user is an admin by checking the role from the user object

export default {
  Query: {
    cats: async () => {
      const cats = await catModel.find({});
      return cats;
    },
    catById: async (_parent: unknown, args: Cat) => {
      return await catModel.findById(args.id);
    },
    catsByOwner: async (_parent: unknown, args: UserIdWithToken) => {
      return await catModel.find({owner: args.id});
    },
    catsByArea: async (_parent: unknown, args: locationInput) => {
      const bounds = rectangleBounds(args.topRight, args.bottomLeft);
      return await catModel.find({
        location: {
          $geoWithin: {
            $geometry: bounds,
          },
        },
      });
    },
  },
  Mutation: {
    createCat: async (_parent: unknown, args: Cat, user: UserIdWithToken) => {
      if (!user.token) null;
      args.owner = user.id as unknown as Types.ObjectId;
      const cat: Cat = new catModel({
        cat_name: args.cat_name,
        weight: args.weight,
        birthdate: args.birthdate,
        filename: args.filename,
        location: args.location,
        owner: args.owner,
      }) as Cat;
      const createCat: Cat = (await catModel.create(cat)) as Cat;
      if (!createCat) {
        throw new GraphQLError('Cat not created', {
          extensions: {code: 'NOT_CREATED'},
        });
      }
      return createCat;
    },
    updateCat: async (_parent: unknown, args: Cat, user: UserIdWithToken) => {
      const cat: Cat = (await catModel.findById(args.id)) as Cat;
      if (!user.token || cat.owner.toString() !== user.id) {
        throw new GraphQLError('Not authorized', {
          extensions: {code: 'NOT_AUTHORIZED'},
        });
      }
      const updatedCat: Cat = (await catModel.findByIdAndUpdate(args.id, args, {
        new: true,
      })) as Cat;
      return updatedCat;
    },
    deleteCat: async (_parent: unknown, args: Cat, user: UserIdWithToken) => {
      const cat: Cat = (await catModel.findById(args.id)) as Cat;
      if (!user.token || cat.owner.toString() !== user.id) {
        throw new GraphQLError('Not authorized', {
          extensions: {code: 'NOT_AUTHORIZED'},
        });
      }
      const deletedCat: Cat = (await catModel.findByIdAndDelete(
        args.id
      )) as Cat;
      return deletedCat;
    },
    updateCatAsAdmin: async (
      _parent: unknown,
      args: Cat,
      user: UserIdWithToken
    ) => {
      if (!user.token || user.role !== 'admin') {
        throw new GraphQLError('Not authorized', {
          extensions: {code: 'NOT_AUTHORIZED'},
        });
      }
      const updatedCat: Cat = (await catModel.findByIdAndUpdate(args.id, args, {
        new: true,
      })) as Cat;
      return updatedCat;
    },
    deleteCatAsAdmin: async (
      _parent: unknown,
      args: Cat,
      user: UserIdWithToken
    ) => {
      if (!user.token || user.role !== 'admin') {
        throw new GraphQLError('Not authorized', {
          extensions: {code: 'NOT_AUTHORIZED'},
        });
      }
      const deleteCat: Cat = (await catModel.findByIdAndDelete(args.id)) as Cat;
      return deleteCat;
    },
  },
};
