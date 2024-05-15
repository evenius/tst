import axios from 'axios';
import QueryString from 'qs';
import { FC, ReactNode, createContext, useCallback, useContext, useEffect, useState } from 'react';

import { IEntitlement } from '@/models/IEntitlement.interface';
import { Page as PageType } from '@/payload-types';
import { Page, pages } from '@/utils/pages';
import { PayloadCollectionResponse } from '@/utils/typescript';

import { useAccountState } from './accountContext';

interface NavigationContextProps {
  footerNav: Page[];
  mainNav: Page[];
}

const NavigationContext = createContext<NavigationContextProps>({
  footerNav: [],
  mainNav: [],
});

export const NavigationProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [footerNav, setFooterNav] = useState<Page[]>([]);
  const [mainNav, setMainNav] = useState<Page[]>([]);

  const { auth } = useAccountState();

  const transformPayloadNav = (payloadNav: PageType[]): Page[] => {
    return payloadNav.map((page) => ({
      label: page.label,
      slug: page.slug,
      isPrivate: false,
      displayInHeader: !!page.displayInHeader,
      placement: page.navigation,
    }));
  };

  const fetchPayloadNav = useCallback(async () => {
    try {
      const { data: entitlement } = await axios.get<IEntitlement>(`/api/offers/entitlement/${auth.token}`);
      const entitlementIds = entitlement.data.viewer.entitlements.edges.map((offer) => offer.node.offer.id);

      const query = {
        or: [
          {
            'accessOfferIds.magineOfferId': {
              in: entitlementIds,
            },
          },
          {
            isPrivate: {
              equals: false,
            },
          },
        ],
      };

      const stringifiedQuery = QueryString.stringify(
        {
          where: query,
        },
        { addQueryPrefix: true }
      );
      const response = await axios.get<PayloadCollectionResponse<PageType>>(
        `${process.env.NEXT_PUBLIC_PAYLOAD_URL}/api/pages/${stringifiedQuery}`
      );

      const allPages = transformPayloadNav(response.data.docs).concat(pages);

      setFooterNav(allPages.filter((page) => page.placement === 'footer'));
      setMainNav(allPages.filter((page) => page.placement === 'main'));
    } catch (error) {
      // eslint-disable-next-line no-console
      console.log('Error fetching pages:', error);
    }
  }, [auth?.token]);

  useEffect(() => {
    fetchPayloadNav();
  }, [fetchPayloadNav]);

  return <NavigationContext.Provider value={{ footerNav, mainNav }}>{children}</NavigationContext.Provider>;
};

export const useNavigation = () => useContext(NavigationContext);
